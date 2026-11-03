import { isFlashBookable, formatFlashDuration } from "./flash";

function assert(cond: boolean, msg: string) {
  if (!cond) throw new Error("FAIL: " + msg);
  console.log("PASS:", msg);
}

const now = new Date();
assert(isFlashBookable({ active: true, oneOff: false, claimedAt: null }), "repeatable design is bookable");
assert(isFlashBookable({ active: true, oneOff: false, claimedAt: now }), "repeatable design stays bookable after a booking");
assert(isFlashBookable({ active: true, oneOff: true, claimedAt: null }), "unclaimed one of a kind is bookable");
assert(!isFlashBookable({ active: true, oneOff: true, claimedAt: now }), "claimed one of a kind is gone");
assert(!isFlashBookable({ active: false, oneOff: false, claimedAt: null }), "hidden design isn't bookable");
assert(formatFlashDuration(60) === "1 hr", "one hour label");
assert(formatFlashDuration(90) === "1.5 hrs", "fractional hours label");

console.log("\nAll flash tests passed.");
