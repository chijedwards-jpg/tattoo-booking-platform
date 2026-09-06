/**
 * Availability & slot calculation.
 *
 * Like pricingEngine.ts, this is pure logic with no DB/Next.js imports —
 * easy to test on its own. It takes the artist's weekly recurring schedule
 * plus their already-booked appointments, and returns the actual open time
 * slots for a tattoo of a given duration over the next N days.
 */

export interface WeeklyAvailability {
  dayOfWeek: number; // 0=Sun..6=Sat
  startTime: string; // "10:00", 24h local
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
  daysAhead?: number;
  slotIncrementMins?: number;
  now?: Date;
}): AvailableSlot[] {
  const {
    weeklyAvailability,
    busy,
    durationMins,
    daysAhead = 14,
    slotIncrementMins = 30,
    now = new Date(),
  } = params;

  const slots: AvailableSlot[] = [];

  for (let dayOffset = 0; dayOffset < daysAhead; dayOffset++) {
    const day = new Date(now);
    day.setDate(day.getDate() + dayOffset);
    day.setHours(0, 0, 0, 0);

    const dayOfWeek = day.getDay();
    const windowsForDay = weeklyAvailability.filter((w) => w.dayOfWeek === dayOfWeek);

    for (const window of windowsForDay) {
      const windowStart = combineDateAndTime(day, window.startTime);
      const windowEnd = combineDateAndTime(day, window.endTime);

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

function combineDateAndTime(date: Date, time: string): Date {
  const [hours, minutes] = time.split(":").map(Number);
  const result = new Date(date);
  result.setHours(hours, minutes, 0, 0);
  return result;
}

function addMinutes(date: Date, mins: number): Date {
  return new Date(date.getTime() + mins * 60_000);
}
