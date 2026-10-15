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
  studentId: string;
  scannedAt: string;
};

/* -------------------- DATE HANDLING -------------------- */

// Treat timestamps without a timezone as Philippine time (UTC+8).
// Timestamps that already contain Z or a timezone offset are
// interpreted according to that timezone.
function parseEventDate(value: string | null): Date | null {
  if (!value) {
    return null;
  }

  const localMatch = value.match(
    /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::(\d{2})(?:\.(\d+))?)?$/,
  );

  if (localMatch) {
    const year = Number(localMatch[1]);
    const month = Number(localMatch[2]);
    const day = Number(localMatch[3]);
    const hour = Number(localMatch[4]);
    const minute = Number(localMatch[5]);
    const second = Number(localMatch[6] ?? 0);
    const fraction = localMatch[7] ?? "";
    const millisecond = Number(fraction.padEnd(3, "0").slice(0, 3));

    const utcTime =
      Date.UTC(year, month - 1, day, hour, minute, second, millisecond) -
      8 * 60 * 60 * 1000;

    return new Date(utcTime);
  }

  // Preserve an explicit timezone, such as Z or +08:00.
  return new Date(value);
}

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
    const start = parseEventDate(event.start_time);
    const end = parseEventDate(event.end_time);

    // Debug information for checking event time mismatches.
    console.log("ATTENDANCE TIME CHECK:", {
      eventTitle: event.title,
      nowISO: now.toISOString(),
      nowLocal: now.toString(),
      rawStart: event.start_time,
      parsedStartISO: start?.toISOString() ?? null,
      rawEnd: event.end_time,
      parsedEndISO: end?.toISOString() ?? null,
      blocked: start ? now < start : false,
    });

    // Prevent registration if the stored event dates are invalid.
    if (
      (event.start_time && (!start || Number.isNaN(start.getTime()))) ||
      (event.end_time && (!end || Number.isNaN(end.getTime())))
    ) {
      return {
        success: false,
        message:
          "The event schedule is invalid. Please contact the administrator.",
      };
    }

    // Check whether the event has started.
    if (start && now < start) {
      return {
        success: false,
        message: "This event has not started yet.",
      };
    }

    // Check whether the event has ended.
    if (end && now > end) {
      return {
        success: false,
        message: "This event has already ended.",
      };
    }

    // Register the student's attendance.
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
