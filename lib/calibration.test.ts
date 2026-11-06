import {
  CALIBRATION_EXAMPLES, STYLE_FOLLOWS, MIN_MULTIPLIER, MAX_MULTIPLIER,
  multiplierFromAnswer, calibrateStyles, rangeMidpoint,
} from "./calibration";
import { VALID_STYLES } from "./aiAnalysis";
import { calculateEstimate } from "./pricingEngine";

function assert(cond: boolean, msg: string) {
  if (!cond) throw new Error("FAIL: " + msg);
  console.log("PASS:", msg);
}

// PRICE mode: premium over the artist's own hours x rate.
assert(multiplierFromAnswer({ hours: 2, price: 300 }, 3.5, 150, "PRICE") === 1, "price matching own hours x rate gives 1.0");
assert(multiplierFromAnswer({ hours: 2, price: 360 }, 3.5, 150, "PRICE") === 1.2, "charging over own time is a premium");
assert(multiplierFromAnswer({ hours: 2, price: 30 }, 3.5, 150, "PRICE") === MIN_MULTIPLIER, "very low price is clamped");
assert(multiplierFromAnswer({ hours: 1, price: 99999 }, 3.5, 150, "PRICE") === MAX_MULTIPLIER, "very high price is clamped");
assert(multiplierFromAnswer({ hours: 2, price: null }, 3.5, 150, "PRICE") === null, "Price mode needs a price");

// TIME mode: speed against the analyzer's hours.
assert(multiplierFromAnswer({ hours: 3.5, price: null }, 3.5, 150, "TIME") === 1, "same hours as the analyzer gives 1.0");
assert(multiplierFromAnswer({ hours: 7, price: null }, 3.5, 150, "TIME") === 2, "twice as long gives 2.0");
assert(multiplierFromAnswer({ hours: 0, price: 300 }, 3.5, 150, "TIME") === null, "no hours, no multiplier");

// The bug this replaced: an artist who'd do the color example in 2 hrs
// (analyzer says 3.5) for $250-300 at $150/hr. A later 2-hr request in that
// style should price near 2 x $150, not get halved.
{
  const color = CALIBRATION_EXAMPLES.find((e) => e.id === "color")!;
  const m = multiplierFromAnswer({ hours: 2, price: rangeMidpoint({ low: 250, high: 300 }) }, color.baselineHours, 150, "PRICE")!;
  const est = calculateEstimate(
    { detectedStyle: "Color", estimatedHours: 2, complexity: 4, confidence: 0.9, colorVsBW: "color" },
    { hourlyRate: 150, minimumPrice: 100, rangeSpreadPct: 0.1 },
    [{ name: "Color", multiplier: m }],
    "PRICE"
  );
  assert(est.basePrice >= 260 && est.basePrice <= 290, `2-hr color request prices near the artist's quote (got $${est.basePrice})`);
}

// TIME mode books the artist's own hours for the example itself.
{
  const ex = CALIBRATION_EXAMPLES[1];
  const m = multiplierFromAnswer({ hours: 5, price: null }, ex.baselineHours, 180, "TIME")!;
  const est = calculateEstimate(
    { detectedStyle: ex.style, estimatedHours: ex.baselineHours, complexity: 5, confidence: 0.9, colorVsBW: "color" },
    { hourlyRate: 180, minimumPrice: 0, rangeSpreadPct: 0 },
    [{ name: ex.style, multiplier: m }],
    "TIME"
  );
  assert(Math.abs(est.adjustedHours - 5) <= 0.2, "TIME mode slot length matches the artist's hours");
}

const all = Object.fromEntries(CALIBRATION_EXAMPLES.map((e) => [e.id, { hours: e.baselineHours, price: e.baselineHours * 200 }]));
for (const mode of ["TIME", "PRICE"] as const) {
  const styles = calibrateStyles(all, 200, mode);
  assert(styles.every((s) => s.multiplier === 1), `${mode}: answers matching the analyzer and hours x rate give all 1.0`);
  assert(styles.length === CALIBRATION_EXAMPLES.length + Object.keys(STYLE_FOLLOWS).length, `${mode}: related styles follow their example`);
}

const partial = calibrateStyles({ minimalist: { hours: 1, price: 100 } }, 200, "PRICE");
assert(partial.every((s) => s.fromExample === "minimalist"), "skipped examples change nothing");
assert(partial.some((s) => s.style === "Fine Line"), "Fine Line follows Minimalist");

const covered = new Set([...CALIBRATION_EXAMPLES.map((e) => e.style), ...Object.keys(STYLE_FOLLOWS)]);
assert(VALID_STYLES.every((s) => s === "Other" || covered.has(s)), "every detectable style except Other is covered");
assert(CALIBRATION_EXAMPLES.every((e) => VALID_STYLES.includes(e.style)), "example styles are ones the analyzer detects");
assert(rangeMidpoint({ low: 500, high: 700 }) === 600, "a range calibrates to its midpoint");

console.log("\nAll calibration tests passed.");
