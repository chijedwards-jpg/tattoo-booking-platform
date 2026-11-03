import { prisma } from "@/lib/db";
import { calculateAvailableSlots, type AvailableSlot } from "@/lib/availability";
import { fetchGoogleBusyIntervals } from "@/lib/googleOAuth";
import { DEFAULT_TIME_ZONE } from "@/lib/timeZones";

const SLOT_SEARCH_DAYS_AHEAD = 14; // must match calculateAvailableSlots' own default

/** An artist's open slots right now, after their appointments and Google Calendar. */
export async function findOpenSlots(params: {
  artistId: string;
  timeZone: string | null;
  availability: { type: string; dayOfWeek: number | null; startTime: string; endTime: string }[];
  type: "TATTOO" | "CONSULTATION";
  durationMins: number;
}): Promise<{ slots: AvailableSlot[]; timeZone: string }> {
  const windows = params.availability
    .filter((a) => a.type === params.type && a.dayOfWeek !== null)
    .map((a) => ({
      dayOfWeek: a.dayOfWeek as number,
      startTime: a.startTime,
      endTime: a.endTime,
    }));

  // An artist can't be double-booked regardless of appointment type, so
  // consultation slots need to steer clear of scheduled tattoo appointments
  // (and vice versa), no type filter here on purpose.
  const existingAppointments = await prisma.appointment.findMany({
    where: { artistId: params.artistId, status: "SCHEDULED" },
  });

  // Also fold in the artist's real Google Calendar busy times, if they've
  // connected one. Fails open to [] on any error (not connected, revoked
  // access, Google API hiccup) rather than breaking availability entirely;
  // see fetchGoogleBusyIntervals.
  const now = new Date();
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
  });

  return { slots, timeZone };
}
