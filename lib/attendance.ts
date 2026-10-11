import { getEventByCode } from "./events";
import { parseQRPayload } from "./qr";
import { supabase } from "./supabase";

/* -------------------- TYPES -------------------- */

export type RegisterResult = {
  success: boolean;
  message: string;
  eventTitle?: string;
};

export type AttendanceRecord = {
  id: string;
  eventId: string;
  eventTitle: string;
  scannedAt: string;
};

export type TeacherEventAttendance = {
  eventId: string;
  eventCode: string;
  title: string;
  startTime: string | null;
  endTime: string | null;
  attendeeCount: number;
  attendees: {
    studentId: string;
    studentName?: string | null;
    scannedAt: string;
  }[];
};

export type TeacherEventSummary = {
  eventId: string;
  eventCode: string;
  title: string;
  attendeeCount: number;
};

export type AdminAttendanceRecord = {
  id: string;
  studentId: string;
  eventId: string;
  scannedAt: string;
  studentName: string | null;
  studentEmail: string | null;
  eventTitle: string | null;
  eventCode: string | null;
};

type TeacherAttendeeRPCRow = {
  event_id: string;
  student_id: string;
  student_name: string | null;
  scanned_at: string;
};

/* -------------------- REGISTER ATTENDANCE -------------------- */

export async function registerAttendance(
  rawPayload: string,
  studentId: string,
): Promise<RegisterResult> {
  try {
    const parsed = parseQRPayload(rawPayload);

    if (!parsed.ok) {
      return {
        success: false,
        message: "Invalid QR code.",
      };
    }

    const payload = parsed.payload;
    const event = await getEventByCode(payload.event);

    if (!event) {
      return {
        success: false,
        message: "Event not found.",
      };
    }

    const now = new Date();
    const start = event.start_time ? new Date(event.start_time) : null;
    const end = event.end_time ? new Date(event.end_time) : null;

    if (start && now < start) {
      return {
        success: false,
        message: "This event has not started yet.",
      };
    }

    if (end && now > end) {
      return {
        success: false,
        message: "This event has already ended.",
      };
    }

    const { error } = await supabase.from("attendance").insert({
      student_id: studentId,
      event_id: event.id,
      scanned_at: now.toISOString(),
    });

    if (error) {
      if (error.code === "23505") {
        return {
          success: false,
          message: "You have already attended this event.",
        };
      }

      console.error("REGISTER ATTENDANCE ERROR:", error);

      return {
        success: false,
        message: error.message || "Failed to register attendance.",
      };
    }

    return {
      success: true,
      message: "Attendance registered successfully!",
      eventTitle: event.title,
    };
  } catch (error) {
    console.error("REGISTER ATTENDANCE ERROR:", error);

    return {
      success: false,
      message:
        error instanceof Error
          ? error.message
          : "Unable to register attendance.",
    };
  }
}

/* -------------------- STUDENT HISTORY -------------------- */

export async function getAttendanceHistory(
  studentId: string,
): Promise<AttendanceRecord[]> {
  const { data, error } = await supabase
    .from("attendance")
    .select(
      `
      id,
      event_id,
      scanned_at,
      events (
        title,
        event_code
      )
    `,
    )
    .eq("student_id", studentId)
    .order("scanned_at", { ascending: false });

  if (error) {
    console.error("GET ATTENDANCE HISTORY ERROR:", error.message);
    return [];
  }

  return (data ?? []).map((row: any) => ({
    id: row.id,
    eventId: row.event_id,
    eventTitle: row.events?.title ?? "Unknown event",
    scannedAt: row.scanned_at,
  }));
}

/* -------------------- TEACHER EVENT ATTENDANCE -------------------- */

export async function getTeacherEventAttendance(
  teacherId: string,
): Promise<TeacherEventAttendance[]> {
  const { data: events, error: eventError } = await supabase
    .from("events")
    .select("id, event_code, title, start_time, end_time")
    .eq("created_by", teacherId)
    .order("created_at", { ascending: false });

  if (eventError || !events) {
    console.error("GET TEACHER EVENTS ERROR:", eventError?.message);
    return [];
  }

  if (events.length === 0) {
    return [];
  }

  const { data: attendeeRows, error: attendeeError } = await supabase.rpc(
    "get_teacher_event_attendees",
  );

  console.log("TEACHER ID:", teacherId);
  console.log("RPC ATTENDEE DATA:", attendeeRows);
  console.log("RPC ATTENDEE ERROR:", attendeeError);

  if (attendeeError) {
    console.error("GET TEACHER EVENT ATTENDEES ERROR:", attendeeError.message);
    return events.map((event) => ({
      eventId: event.id,
      eventCode: event.event_code,
      title: event.title,
      startTime: event.start_time,
      endTime: event.end_time,
      attendeeCount: 0,
      attendees: [],
    }));
  }

  const rows = (attendeeRows ?? []) as TeacherAttendeeRPCRow[];
  const attendeesByEvent = new Map<
    string,
    TeacherEventAttendance["attendees"]
  >();

  for (const row of rows) {
    if (!row.event_id || !row.student_id) {
      continue;
    }

    const attendees = attendeesByEvent.get(row.event_id) ?? [];

    attendees.push({
      studentId: row.student_id,
      studentName: row.student_name,
      scannedAt: row.scanned_at,
    });

    attendeesByEvent.set(row.event_id, attendees);
  }

  return events.map((event) => {
    const attendees = attendeesByEvent.get(event.id) ?? [];

    return {
      eventId: event.id,
      eventCode: event.event_code,
      title: event.title,
      startTime: event.start_time,
      endTime: event.end_time,
      attendeeCount: attendees.length,
      attendees,
    };
  });
}

/* -------------------- TEACHER EVENT SUMMARY -------------------- */

export async function getTeacherEventSummary(
  teacherId: string,
): Promise<TeacherEventSummary[]> {
  const events = await getTeacherEventAttendance(teacherId);

  return events.map((event) => ({
    eventId: event.eventId,
    eventCode: event.eventCode,
    title: event.title,
    attendeeCount: event.attendeeCount,
  }));
}

/* -------------------- ADMIN ATTENDANCE -------------------- */

export async function getAllAttendance(): Promise<AdminAttendanceRecord[]> {
  const { data, error } = await supabase
    .from("attendance")
    .select(
      `
      id,
      student_id,
      event_id,
      scanned_at,
      profiles (
        full_name,
        email
      ),
      events (
        title,
        event_code
      )
    `,
    )
    .order("scanned_at", { ascending: false });

  if (error) {
    console.error("GET ALL ATTENDANCE ERROR:", error.message);
    return [];
  }

  return (data ?? []).map((row: any) => ({
    id: row.id,
    studentId: row.student_id,
    eventId: row.event_id,
    scannedAt: row.scanned_at,
    studentName: row.profiles?.full_name ?? null,
    studentEmail: row.profiles?.email ?? null,
    eventTitle: row.events?.title ?? null,
    eventCode: row.events?.event_code ?? null,
  }));
}

/* -------------------- DELETE ATTENDANCE -------------------- */

export async function deleteAttendance(
  attendanceId: string,
): Promise<{ error: unknown | null }> {
  const { error } = await supabase
    .from("attendance")
    .delete()
    .eq("id", attendanceId);

  if (error) {
    console.error("DELETE ATTENDANCE ERROR:", error.message);
  }

  return { error };
}

/* -------------------- UPDATE ATTENDANCE -------------------- */

export async function updateAttendance(
  attendanceId: string,
  studentId: string,
  eventId: string,
): Promise<{ error: unknown | null }> {
  const { error } = await supabase
    .from("attendance")
    .update({
      student_id: studentId,
      event_id: eventId,
    })
    .eq("id", attendanceId);

  if (error) {
    console.error("UPDATE ATTENDANCE ERROR:", error.message);
  }

  return { error };
}
