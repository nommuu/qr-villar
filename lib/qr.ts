export type QRPayload = {
  v: 1;
  event: string;
  title?: string;
  start?: string;
  end?: string;
};

export function buildQRPayload(event: {
  eventId: string;
  title: string;
  start?: string;
  end?: string;
}): string {
  const payload: QRPayload = {
    v: 1,
    event: event.eventId,
  };

  if (event.title) payload.title = event.title;
  if (event.start) payload.start = event.start;
  if (event.end) payload.end = event.end;

  return JSON.stringify(payload);
}

export type ParseQRResult =
  | { ok: true; payload: QRPayload }
  | { ok: false; message: string };

export function parseQRPayload(raw: string): ParseQRResult {
  const value = raw.trim();

  if (!value) {
    return {
      ok: false,
      message: "Invalid QR code.",
    };
  }

  try {
    const parsed: unknown = JSON.parse(value);

    if (typeof parsed !== "object" || parsed === null) {
      return {
        ok: false,
        message: "Not an attendance QR code.",
      };
    }

    const payload = parsed as Record<string, unknown>;

    if (
      payload.v !== 1 ||
      typeof payload.event !== "string" ||
      !payload.event.trim()
    ) {
      return {
        ok: false,
        message: "Not an attendance QR code.",
      };
    }

    return {
      ok: true,
      payload: {
        v: 1,
        event: payload.event,
        ...(typeof payload.title === "string" ? { title: payload.title } : {}),
        ...(typeof payload.start === "string" ? { start: payload.start } : {}),
        ...(typeof payload.end === "string" ? { end: payload.end } : {}),
      },
    };
  } catch {
    // Admin Dashboard QR codes may contain a plain event code,
    // such as "VER - T012" or "HACK - E001".
    return {
      ok: true,
      payload: {
        v: 1,
        event: value,
      },
    };
  }
}
