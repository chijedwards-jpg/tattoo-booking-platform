import {
  CALIBRATION_EXAMPLES, STYLE_FOLLOWS, MIN_MULTIPLIER, MAX_MULTIPLIER,
  multiplierFromPrice, calibrateStyles,
} from "./calibration";
import { VALID_STYLES } from "./aiAnalysis";
import { calculateEstimate } from "./pricingEngine";

function assert(cond: boolean, msg: string) {
  if (!cond) throw new Error("FAIL: " + msg);
  console.log("PASS:", msg);
}

assert(multiplierFromPrice(400, 2, 200) === 1, "price matching hours x rate gives 1.0");
assert(multiplierFromPrice(300, 2, 200) === 0.75, "cheaper than hours x rate lowers the multiplier");
assert(multiplierFromPrice(430, 2, 200) === 1.1, "rounds to the nearest 0.05");
assert(multiplierFromPrice(10, 2, 200) === MIN_MULTIPLIER, "very low price is clamped");
assert(multiplierFromPrice(99999, 2, 200) === MAX_MULTIPLIER, "very high price is clamped");
assert(multiplierFromPrice(0, 2, 200) === 1, "zero price leaves the multiplier neutral");

// Pricing the example back through the real engine lands on the artist's price.
for (const mode of ["TIME", "PRICE"] as const) {
  const ex = CALIBRATION_EXAMPLES[1];
  const price = ex.baselineHours * 180 * 1.3;
  const m = multiplierFromPrice(price, ex.baselineHours, 180);
  const est = calculateEstimate(
    { detectedStyle: ex.style, estimatedHours: ex.baselineHours, complexity: 5, confidence: 0.9, colorVsBW: "color" },
    { hourlyRate: 180, minimumPrice: 0, rangeSpreadPct: 0 },
    [{ name: ex.style, multiplier: m }],
    mode
  );
  assert(Math.abs(est.basePrice - price) < 1, `${mode} mode estimate matches the artist's example price`);
}

const all = Object.fromEntries(CALIBRATION_EXAMPLES.map((e) => [e.id, e.baselineHours * 200]));
const styles = calibrateStyles(all, 200);
assert(styles.every((s) => s.multiplier === 1), "pricing every example at hours x rate gives all 1.0");
assert(styles.length === CALIBRATION_EXAMPLES.length + Object.keys(STYLE_FOLLOWS).length, "related styles follow their example");

const partial = calibrateStyles({ minimalist: 100 }, 200);
assert(partial.every((s) => s.fromExample === "minimalist"), "skipped examples change nothing");
assert(partial.some((s) => s.style === "Fine Line"), "Fine Line follows Minimalist");

const covered = new Set([...CALIBRATION_EXAMPLES.map((e) => e.style), ...Object.keys(STYLE_FOLLOWS)]);
assert(VALID_STYLES.every((s) => s === "Other" || covered.has(s)), "every detectable style except Other is covered");
assert(CALIBRATION_EXAMPLES.every((e) => VALID_STYLES.includes(e.style)), "example styles are ones the analyzer detects");

console.log("\nAll calibration tests passed.");
