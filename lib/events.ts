import { supabase } from "./supabase";

export type Event = {
  eventId: string;
  title: string;
  start: string;
  end: string;
};

export type CloudEvent = {
  id: string;
  event_code: string;
  title: string;
  start_time: string | null;
  end_time: string | null;
  created_by: string | null;
  created_at: string;
  venue?: string | null;
  description?: string | null;
  status?: "open" | "closed";
};

export async function createEvent(
  event: Event,
): Promise<{ error: string | null }> {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { error } = await supabase.from("events").upsert(
    {
      event_code: event.eventId,
      title: event.title,
      start_time: event.start || null,
      end_time: event.end || null,
      created_by: user?.id ?? null,
    },
    { onConflict: "event_code" },
  );

  return { error: error?.message ?? null };
}

export async function getEventsByTeacher(
  teacherId: string,
): Promise<CloudEvent[]> {
  const { data, error } = await supabase
    .from("events")
    .select("*")
    .eq("created_by", teacherId)
    .order("created_at", { ascending: false });

  if (error || !data) {
    return [];
  }

  return data as CloudEvent[];
}

export async function getEventByCode(code: string): Promise<CloudEvent | null> {
  const { data, error } = await supabase
    .from("events")
    .select("*")
    .eq("event_code", code)
    .maybeSingle();

  if (error || !data) {
    return null;
  }

  return data as CloudEvent;
}

export async function getAllEvents(): Promise<CloudEvent[]> {
  const { data, error } = await supabase
    .from("events")
    .select("*")
    .order("created_at", { ascending: false });

  if (error || !data) {
    console.log("GET ALL EVENTS ERROR:", error?.message);
    return [];
  }

  return data as CloudEvent[];
}

export async function updateEventStatus(
  eventId: string,
  status: "open" | "closed",
): Promise<{ error: string | null }> {
  const { error } = await supabase.rpc("admin_update_event_status", {
    target_event_id: eventId,
    new_status: status,
  });

  if (error) {
    console.log("UPDATE EVENT STATUS ERROR:", error.message);
    return { error: error.message };
  }

  return { error: null };
}
