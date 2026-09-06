import { calculateEstimate, decideRouting } from './pricingEngine';

function assert(cond: boolean, msg: string) {
  if (!cond) throw new Error('FAIL: ' + msg);
  console.log('PASS:', msg);
}

// --- Pricing: basic case, matches PRD example (section 13) ---
// 2 hours base, $250/hr, color multiplier 1.2 -> base price $600 (before range)
const est1 = calculateEstimate(
  { detectedStyle: 'Color', estimatedHours: 2, complexity: 4, confidence: 0.9, colorVsBW: 'color' },
  { hourlyRate: 250, minimumPrice: 150, rangeSpreadPct: 0.1 },
  [{ name: 'Color', timeMultiplier: 1.2 }]
);
assert(est1.adjustedHours === 2.4, `adjustedHours 2.4, got ${est1.adjustedHours}`);
assert(est1.basePrice === 600, `basePrice 600, got ${est1.basePrice}`);
assert(est1.appliedMinimum === false, 'minimum not applied when base exceeds it');
assert(est1.priceLow === 540 && est1.priceHigh === 660, `range 540-660, got ${est1.priceLow}-${est1.priceHigh}`);

// --- Pricing: minimum price kicks in (PRD section 11 example) ---
const est2 = calculateEstimate(
  { detectedStyle: 'Minimalist', estimatedHours: 0.4, complexity: 1, confidence: 0.95, colorVsBW: 'black_grey' },
  { hourlyRate: 250, minimumPrice: 150, rangeSpreadPct: 0.1 },
  [{ name: 'Minimalist', timeMultiplier: 0.9 }]
);
assert(est2.basePrice < 150, 'base price under minimum before floor applied');
assert(est2.appliedMinimum === true, 'minimum applied');
assert(est2.priceLow === 150, `priceLow floors at minimum, got ${est2.priceLow}`);

// --- Routing: clean GREEN case ---
const rules = {
  maxAutoBookDurationMins: 180,
  maxAutoBookComplexity: 6,
  minAiConfidence: 0.75,
  referenceFreedomMaxForAutoBook: 40,
  requireConsultAboveDurationMins: 240,
};
const green = decideRouting(
  {
    estimatedHours: 2,
    complexity: 4,
    aiConfidence: 0.9,
    referenceFreedom: 20,
    placementRestricted: false,
    styleRestricted: false,
    subjectMatterRestricted: false,
  },
  rules
);
assert(green === 'GREEN_AUTO_BOOKABLE', `expected GREEN, got ${green}`);

// --- Routing: low confidence -> YELLOW, not RED ---
const yellow = decideRouting(
  {
    estimatedHours: 2,
    complexity: 4,
    aiConfidence: 0.5, // below threshold
    referenceFreedom: 20,
    placementRestricted: false,
    styleRestricted: false,
    subjectMatterRestricted: false,
  },
  rules
);
assert(yellow === 'YELLOW_ARTIST_REVIEW', `expected YELLOW, got ${yellow}`);

// --- Routing: restricted placement -> RED regardless of everything else ---
const red = decideRouting(
  {
    estimatedHours: 0.5,
    complexity: 1,
    aiConfidence: 0.99,
    referenceFreedom: 0,
    placementRestricted: true,
    styleRestricted: false,
    subjectMatterRestricted: false,
  },
  rules
);
assert(red === 'RED_CONSULTATION_REQUIRED', `expected RED, got ${red}`);

// --- Routing: duration exceeds hard consult cutoff -> RED even if everything else fine ---
const redDuration = decideRouting(
  {
    estimatedHours: 5, // 300 mins > 240 cutoff
    complexity: 3,
    aiConfidence: 0.9,
    referenceFreedom: 10,
    placementRestricted: false,
    styleRestricted: false,
    subjectMatterRestricted: false,
  },
  rules
);
assert(redDuration === 'RED_CONSULTATION_REQUIRED', `expected RED, got ${redDuration}`);

console.log('\nAll pricing engine tests passed.');
