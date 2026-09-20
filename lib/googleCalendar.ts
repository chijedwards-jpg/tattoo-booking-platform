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
