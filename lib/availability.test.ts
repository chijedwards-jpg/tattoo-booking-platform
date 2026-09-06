import { calculateAvailableSlots } from "./availability";

function assert(cond: boolean, msg: string) {
  if (!cond) throw new Error("FAIL: " + msg);
  console.log("PASS:", msg);
}

// Fix "now" to a known Monday at 9am so results are deterministic
const monday9am = new Date(2026, 8, 7, 9, 0, 0); // Sept 7 2026 is a Monday

const weeklyAvailability = [
  { dayOfWeek: 1, startTime: "10:00", endTime: "18:00" }, // Mon
];

// --- Basic case: no busy times, 2 hour tattoo ---
const slots1 = calculateAvailableSlots({
  weeklyAvailability,
  busy: [],
  durationMins: 120,
  daysAhead: 1,
  now: monday9am,
});
assert(slots1.length > 0, "produces slots when no conflicts");
assert(
  slots1[0].start.getHours() === 10 && slots1[0].start.getMinutes() === 0,
  `first slot starts at window open (10:00), got ${slots1[0].start.getHours()}:${slots1[0].start.getMinutes()}`
);
// Last possible 2hr slot in a 10-18 window at 30min increments should start at 16:00
const lastSlot = slots1[slots1.length - 1];
assert(
  lastSlot.start.getHours() === 16 && lastSlot.start.getMinutes() === 0,
  `last slot starts at 16:00, got ${lastSlot.start.getHours()}:${lastSlot.start.getMinutes()}`
);

// --- Busy interval blocks overlapping slots ---
const busyStart = new Date(2026, 8, 7, 12, 0, 0);
const busyEnd = new Date(2026, 8, 7, 14, 0, 0);
const slots2 = calculateAvailableSlots({
  weeklyAvailability,
  busy: [{ start: busyStart, end: busyEnd }],
  durationMins: 120,
  daysAhead: 1,
  now: monday9am,
});
const overlapsBusy = slots2.some(
  (s) => s.start < busyEnd && s.end > busyStart
);
assert(!overlapsBusy, "no slot overlaps the busy interval");

// --- Past slots today are excluded ---
const lateMonday = new Date(2026, 8, 7, 17, 30, 0); // 5:30pm, window closes 18:00
const slots3 = calculateAvailableSlots({
  weeklyAvailability,
  busy: [],
  durationMins: 120, // won't fit before 18:00 close
  daysAhead: 1,
  now: lateMonday,
});
assert(slots3.length === 0, "no 2hr slots left when only 30min remains in the day");

console.log("\nAll availability tests passed.");
