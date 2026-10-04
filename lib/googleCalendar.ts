/**
 * Builds a Google Calendar "add event" URL — no auth, no API calls. Anyone
 * (client or artist) can click it to add the appointment to their own
 * Google Calendar. Not a sync: it doesn't know about edits or cancellations
 * made after the fact.
 */
export function googleCalendarUrl(params: {
  title: string;
  description?: string;
  location?: string;
  start: Date;
  end: Date;
}): string {
  const fmt = (d: Date) => d.toISOString().replace(/[-:]/g, "").split(".")[0] + "Z";
  const qs = new URLSearchParams({
    action: "TEMPLATE",
    text: params.title,
    dates: `${fmt(params.start)}/${fmt(params.end)}`,
    details: params.description ?? "",
    location: params.location ?? "",
  });
  return `https://calendar.google.com/calendar/render?${qs.toString()}`;
}

// ---------------------------------------------------------------------------
// Embedding an artist's own Google Calendar
// ---------------------------------------------------------------------------

// Calendar IDs are email-shaped. Google's own shared/holiday calendars also
// use '#' before the '@' (e.g. "en.usa#holiday@group.v.calendar.google.com").
const CALENDAR_ID = /^[A-Za-z0-9._%+#-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/;

/**
 * Pulls a calendar ID out of whatever the artist pasted. Google shows them
 * the ID, a public URL, and a full <iframe> embed snippet in three different
 * places in its settings, so all three are worth accepting.
 *
 * Returns null if nothing valid is found — callers must treat that as a
 * rejection rather than falling back to the raw input, since the result ends
 * up in an iframe URL.
 */
export function parseGoogleCalendarId(input: string): string | null {
  const trimmed = input.trim();
  if (!trimmed) return null;

  // 1. A bare calendar ID.
  if (CALENDAR_ID.test(trimmed)) return trimmed;

  // 2. A public/embed URL, or a full <iframe …> snippet containing one —
  //    both carry the ID in a `src` query param.
  const srcParam = trimmed.match(/[?&]src=([^&"'\s>]+)/);
  if (srcParam) {
    const decoded = safeDecode(srcParam[1]);
    if (decoded && CALENDAR_ID.test(decoded)) return decoded;
  }

  // 3. The "cid=" form Google uses for its share links, which is the
  //    calendar ID in base64.
  const cidParam = trimmed.match(/[?&]cid=([^&"'\s>]+)/);
  if (cidParam) {
    const decoded = safeBase64Decode(safeDecode(cidParam[1]) ?? cidParam[1]);
    if (decoded && CALENDAR_ID.test(decoded)) return decoded;
  }

  return null;
}

/** Read-only month view of a calendar, sized to drop straight into an iframe. */
export function googleCalendarEmbedUrl(calendarId: string, timeZone?: string): string {
  const qs = new URLSearchParams({ src: calendarId, mode: "WEEK" });
  if (timeZone) qs.set("ctz", timeZone);
  return `https://calendar.google.com/calendar/embed?${qs.toString()}`;
}

function safeDecode(value: string): string | null {
  try {
    return decodeURIComponent(value);
  } catch {
    return null;
  }
}

function safeBase64Decode(value: string): string | null {
  try {
    // Google's cid values use base64url and sometimes drop the padding.
    const normalized = value.replace(/-/g, "+").replace(/_/g, "/");
    const padded = normalized + "=".repeat((4 - (normalized.length % 4)) % 4);
    return Buffer.from(padded, "base64").toString("utf8");
  } catch {
    return null;
  }
}
