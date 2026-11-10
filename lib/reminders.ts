import { randomBytes } from "crypto";
import { formatInTimeZone } from "date-fns-tz";

export { REMINDER_DAY_OPTIONS } from "./reminderOptions";

/** Don't send a review request for appointments that ended longer ago than this. */
export const REVIEW_REQUEST_WINDOW_MS = 3 * 24 * 60 * 60 * 1000;

// A reminder right behind the booking confirmation is noise — the client
// has the details in their inbox already.
const JUST_BOOKED_MS = 12 * 60 * 60 * 1000;

/** Unguessable token for a client's confirm / review link. */
export function newClientToken(): string {
  return randomBytes(24).toString("base64url");
}

export function appUrl(): string {
  return process.env.APP_URL ?? "http://localhost:3000";
}

/** The one link a client uses to confirm, ask to reschedule, or review. */
export function clientLink(token: string): string {
  return `${appUrl()}/c/${token}`;
}

/**
 * Calendar days from `now` to `start`, both read in the artist's time zone
 * — so "1 day before" means the day before, whatever hour the cron runs.
 */
export function calendarDaysUntil(start: Date, now: Date, timeZone: string): number {
  const startDay = formatInTimeZone(start, timeZone, "yyyy-MM-dd");
  const today = formatInTimeZone(now, timeZone, "yyyy-MM-dd");
  return Math.round((Date.parse(`${startDay}T00:00:00Z`) - Date.parse(`${today}T00:00:00Z`)) / 86_400_000);
}

/**
 * Decides whether a reminder goes out for one appointment on this run.
 *
 * Every reminder setting that's now due and not yet sent is marked sent
 * together, but only one email goes out — so a client booked two days out
 * with reminders at [7, 3, 2, 1] gets one reminder, not three at once.
 */
export function reminderDecision(params: {
  startTime: Date;
  createdAt: Date;
  now: Date;
  timeZone: string;
  reminderDaysBefore: number[];
  remindersSentDays: number[];
}): { send: boolean; markSent: number[] } {
  const { startTime, createdAt, now, timeZone, reminderDaysBefore, remindersSentDays } = params;
  if (startTime <= now) return { send: false, markSent: [] };

  const daysUntil = calendarDaysUntil(startTime, now, timeZone);
  const due = reminderDaysBefore.filter((d) => d >= daysUntil && !remindersSentDays.includes(d));
  if (due.length === 0) return { send: false, markSent: [] };

  const justBooked = now.getTime() - createdAt.getTime() < JUST_BOOKED_MS;
  return { send: !justBooked, markSent: due };
}
