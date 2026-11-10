import { calculateAvailableSlots } from "./availability";

function assert(cond: boolean, msg: string) {
  if (!cond) throw new Error("FAIL: " + msg);
  console.log("PASS:", msg);
}

const NY = "America/New_York";
const DENVER = "America/Denver";

// Sept 7 2026 is a Monday; 13:00 UTC is 9am in New York
const monday9am = new Date("2026-09-07T13:00:00Z");

const weeklyAvailability = [
  { dayOfWeek: 1, startTime: "10:00", endTime: "18:00" }, // Mon
];

// --- Basic case: no busy times, 2 hour tattoo ---
const slots1 = calculateAvailableSlots({
  weeklyAvailability,
  busy: [],
  durationMins: 120,
  timeZone: NY,
  daysAhead: 1,
  now: monday9am,
});
assert(slots1.length > 0, "produces slots when no conflicts");
assert(
  slots1[0].start.toISOString() === "2026-09-07T14:00:00.000Z",
  `first slot starts at window open (10:00 NY), got ${slots1[0].start.toISOString()}`
);
// Last possible 2hr slot in a 10-18 window at 30min increments should start at 16:00
const lastSlot = slots1[slots1.length - 1];
assert(
  lastSlot.start.toISOString() === "2026-09-07T20:00:00.000Z",
  `last slot starts at 16:00 NY, got ${lastSlot.start.toISOString()}`
);

// --- Busy interval blocks overlapping slots ---
const busyStart = new Date("2026-09-07T16:00:00Z");
const busyEnd = new Date("2026-09-07T18:00:00Z");
const slots2 = calculateAvailableSlots({
  weeklyAvailability,
  busy: [{ start: busyStart, end: busyEnd }],
  durationMins: 120,
  timeZone: NY,
  daysAhead: 1,
  now: monday9am,
});
const overlapsBusy = slots2.some(
  (s) => s.start < busyEnd && s.end > busyStart
);
assert(!overlapsBusy, "no slot overlaps the busy interval");

// --- Past slots today are excluded ---
const lateMonday = new Date("2026-09-07T21:30:00Z"); // 5:30pm NY, window closes 18:00
const slots3 = calculateAvailableSlots({
  weeklyAvailability,
  busy: [],
  durationMins: 120, // won't fit before 18:00 close
  timeZone: NY,
  daysAhead: 1,
  now: lateMonday,
});
assert(slots3.length === 0, "no 2hr slots left when only 30min remains in the day");

// --- Hours are the artist's, whatever zone the server runs in ---
const noonToSix = [{ dayOfWeek: 1, startTime: "12:00", endTime: "18:00" }];
const slots4 = calculateAvailableSlots({
  weeklyAvailability: noonToSix,
  busy: [],
  durationMins: 60,
  timeZone: DENVER,
  daysAhead: 1,
  now: new Date("2026-11-02T15:00:00Z"), // Mon Nov 2, 8am Denver (MST, UTC-7)
});
assert(
  slots4[0].start.toISOString() === "2026-11-02T19:00:00.000Z",
  `12pm Denver is 19:00 UTC, got ${slots4[0].start.toISOString()}`
);
assert(
  slots4[slots4.length - 1].end.toISOString() === "2026-11-03T01:00:00.000Z",
  `last slot ends at 6pm Denver, got ${slots4[slots4.length - 1].end.toISOString()}`
);

// --- Daylight saving: same wall-clock hours, different UTC ---
const slots5 = calculateAvailableSlots({
  weeklyAvailability: [{ dayOfWeek: 5, startTime: "12:00", endTime: "18:00" }],
  busy: [],
  durationMins: 60,
  timeZone: DENVER,
  daysAhead: 1,
  now: new Date("2026-10-30T15:00:00Z"), // Fri Oct 30, before clocks change (MDT, UTC-6)
});
assert(
  slots5[0].start.toISOString() === "2026-10-30T18:00:00.000Z",
  `12pm Denver before the clock change is 18:00 UTC, got ${slots5[0].start.toISOString()}`
);

// --- "Today" is the artist's day, even when UTC has already moved on ---
const mondayNightDenver = new Date("2026-11-03T03:00:00Z"); // Mon 8pm Denver, already Tue in UTC
const slots6 = calculateAvailableSlots({
  weeklyAvailability: [{ dayOfWeek: 2, startTime: "21:00", endTime: "23:00" }], // Tue only
  busy: [],
  durationMins: 60,
  timeZone: DENVER,
  daysAhead: 1,
  now: mondayNightDenver,
});
assert(slots6.length === 0, "a Tuesday window isn't offered while it's still Monday for the artist");

// --- Days off: a blocked date offers nothing, the next week still does ---
const slots7 = calculateAvailableSlots({
  weeklyAvailability: [{ dayOfWeek: 3, startTime: "10:00", endTime: "12:00" }], // Wednesdays
  busy: [],
  durationMins: 60,
  timeZone: DENVER,
  daysAhead: 14,
  now: new Date("2026-11-09T15:00:00Z"), // Mon Nov 9
  blockedDates: ["2026-11-11"], // first Wednesday off
});
assert(
  slots7.every((s) => !s.start.toISOString().startsWith("2026-11-11")),
  "no slots on a day off"
);
assert(
  slots7.some((s) => s.start.toISOString().startsWith("2026-11-18")),
  "the following Wednesday is still offered"
);

// --- Minimum notice: nothing starting sooner than the notice period ---
const noticeNow = new Date("2026-11-11T16:00:00Z"); // Wed 9am Denver
const slots8 = calculateAvailableSlots({
  weeklyAvailability: [{ dayOfWeek: 3, startTime: "10:00", endTime: "18:00" }],
  busy: [],
  durationMins: 60,
  timeZone: DENVER,
  daysAhead: 1,
  now: noticeNow,
  minNoticeMins: 3 * 60,
});
assert(
  slots8.length > 0 && slots8[0].start.getTime() >= noticeNow.getTime() + 3 * 3600_000,
  `first slot is at least 3 hours out, got ${slots8[0]?.start.toISOString()}`
);

console.log("\nAll availability tests passed.");
