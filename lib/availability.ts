/**
 * Availability & slot calculation.
 *
 * Like pricingEngine.ts, this is pure logic with no DB/Next.js imports —
 * easy to test on its own. It takes the artist's weekly recurring schedule
 * plus their already-booked appointments, and returns the actual open time
 * slots for a tattoo of a given duration over the next N days.
 */

import { formatInTimeZone, fromZonedTime } from "date-fns-tz";

export interface WeeklyAvailability {
  dayOfWeek: number; // 0=Sun..6=Sat
  startTime: string; // "10:00", 24h, in the artist's time zone
  endTime: string; // "18:00"
}

export interface BusyInterval {
  start: Date;
  end: Date;
}

export interface AvailableSlot {
  start: Date;
  end: Date;
}

/**
 * Returns bookable start times for a tattoo/consultation of `durationMins`,
 * scanning `daysAhead` days starting today, at `slotIncrementMins` granularity
 * (e.g. offer a new slot every 30 minutes within each open window).
 */
export function calculateAvailableSlots(params: {
  weeklyAvailability: WeeklyAvailability[];
  busy: BusyInterval[];
  durationMins: number;
  timeZone: string;
  daysAhead?: number;
  slotIncrementMins?: number;
  now?: Date;
}): AvailableSlot[] {
  const {
    weeklyAvailability,
    busy,
    durationMins,
    timeZone,
    daysAhead = 14,
    slotIncrementMins = 30,
    now = new Date(),
  } = params;

  const slots: AvailableSlot[] = [];
  const todayInZone = formatInTimeZone(now, timeZone, "yyyy-MM-dd");

  for (let dayOffset = 0; dayOffset < daysAhead; dayOffset++) {
    // Calendar days are the artist's, not the server's (Vercel runs in UTC).
    const [year, month, date] = todayInZone.split("-").map(Number);
    const day = new Date(Date.UTC(year, month - 1, date + dayOffset));
    const dayString = day.toISOString().slice(0, 10);

    const dayOfWeek = day.getUTCDay();
    const windowsForDay = weeklyAvailability.filter((w) => w.dayOfWeek === dayOfWeek);

    for (const window of windowsForDay) {
      const windowStart = combineDateAndTime(dayString, window.startTime, timeZone);
      const windowEnd = combineDateAndTime(dayString, window.endTime, timeZone);

      for (
        let slotStart = new Date(windowStart);
        addMinutes(slotStart, durationMins) <= windowEnd;
        slotStart = addMinutes(slotStart, slotIncrementMins)
      ) {
        const slotEnd = addMinutes(slotStart, durationMins);

        // Skip anything already in the past
        if (slotStart < now) continue;

        // Skip if it overlaps any existing appointment
        const overlaps = busy.some(
          (b) => slotStart < b.end && slotEnd > b.start
        );
        if (overlaps) continue;

        slots.push({ start: new Date(slotStart), end: slotEnd });
      }
    }
  }

  return slots;
}

function combineDateAndTime(date: string, time: string, timeZone: string): Date {
  const [hours, minutes] = time.split(":");
  return fromZonedTime(`${date}T${hours.padStart(2, "0")}:${minutes}:00`, timeZone);
}

function addMinutes(date: Date, mins: number): Date {
  return new Date(date.getTime() + mins * 60_000);
}
