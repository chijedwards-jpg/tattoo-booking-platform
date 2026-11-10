import { prisma } from "@/lib/db";
import { calculateAvailableSlots, type AvailableSlot } from "@/lib/availability";
import { fetchGoogleBusyIntervals } from "@/lib/googleOAuth";
import { DEFAULT_TIME_ZONE } from "@/lib/timeZones";

const SLOT_SEARCH_DAYS_AHEAD = 14; // must match calculateAvailableSlots' own default

/**
 * Earliest a client can book ahead of a slot. Without one, someone could
 * book a session starting in five minutes. Not a per-artist setting yet.
 */
export const MIN_BOOKING_NOTICE_HOURS = 12;

type AvailabilityRow = {
  type: string;
  dayOfWeek: number | null;
  startTime: string;
  endTime: string;
  date?: Date | null;
  isBlocked?: boolean;
};

/**
 * Days off are stored as AvailabilityBlock rows with isBlocked and a date
 * (UTC midnight of the calendar day). Returns them as "YYYY-MM-DD".
 */
export function blockedDatesFrom(availability: AvailabilityRow[]): string[] {
  return availability
    .filter((a) => a.isBlocked && a.date)
    .map((a) => (a.date as Date).toISOString().slice(0, 10));
}

/** An artist's open slots right now, after their appointments, days off and Google Calendar. */
export async function findOpenSlots(params: {
  artistId: string;
  timeZone: string | null;
  availability: AvailabilityRow[];
  type: "TATTOO" | "CONSULTATION";
  durationMins: number;
}): Promise<{ slots: AvailableSlot[]; timeZone: string }> {
  const windows = params.availability
    .filter((a) => a.type === params.type && a.dayOfWeek !== null && !a.isBlocked)
    .map((a) => ({
      dayOfWeek: a.dayOfWeek as number,
      startTime: a.startTime,
      endTime: a.endTime,
    }));

  const now = new Date();

  // An artist can't be double-booked regardless of appointment type, so
  // consultation slots need to steer clear of scheduled tattoo appointments
  // (and vice versa), no type filter here on purpose. Past ones can't
  // overlap a future slot, so they're left out.
  const existingAppointments = await prisma.appointment.findMany({
    where: { artistId: params.artistId, status: "SCHEDULED", endTime: { gt: now } },
    select: { startTime: true, endTime: true },
  });

  // Also fold in the artist's real Google Calendar busy times, if they've
  // connected one. Fails open to [] on any error (not connected, revoked
  // access, Google API hiccup) rather than breaking availability entirely;
  // see fetchGoogleBusyIntervals.
  const searchEnd = new Date(now);
  searchEnd.setDate(searchEnd.getDate() + SLOT_SEARCH_DAYS_AHEAD);
  const googleBusy = await fetchGoogleBusyIntervals(params.artistId, now, searchEnd);

  const timeZone = params.timeZone ?? DEFAULT_TIME_ZONE;

  const slots = calculateAvailableSlots({
    weeklyAvailability: windows,
    busy: [
      ...existingAppointments.map((a) => ({ start: a.startTime, end: a.endTime })),
      ...googleBusy,
    ],
    durationMins: params.durationMins,
    timeZone,
    now,
    blockedDates: blockedDatesFrom(params.availability),
    minNoticeMins: MIN_BOOKING_NOTICE_HOURS * 60,
  });

  return { slots, timeZone };
}
