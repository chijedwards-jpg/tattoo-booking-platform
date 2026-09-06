/**
 * Pricing & Estimation Engine
 *
 * Pure, framework-agnostic logic. No DB or Next.js imports here on purpose —
 * makes this trivial to unit test and to reuse from API routes, scripts,
 * or a future background job (e.g. re-pricing historical submissions).
 */

export interface StyleConfig {
  name: string;
  timeMultiplier: number;
}

export interface PricingConfigInput {
  hourlyRate: number;
  minimumPrice: number;
  rangeSpreadPct: number; // e.g. 0.15 for +/-15%
}

export interface AiAnalysisInput {
  detectedStyle: string;
  estimatedHours: number; // base estimate before style multiplier
  complexity: number; // 1-10
  confidence: number; // 0-1
  colorVsBW: 'color' | 'black_grey';
}

export interface PriceEstimate {
  baseHours: number;
  adjustedHours: number;
  basePrice: number;
  priceLow: number;
  priceHigh: number;
  appliedMinimum: boolean;
  styleMultiplierUsed: number;
}

/**
 * Core calculation: estimated hours x hourly rate, adjusted by style
 * multiplier, floored by minimum price, expressed as a range.
 */
export function calculateEstimate(
  ai: AiAnalysisInput,
  pricing: PricingConfigInput,
  styles: StyleConfig[]
): PriceEstimate {
  const styleConfig = styles.find(
    (s) => s.name.toLowerCase() === ai.detectedStyle.toLowerCase()
  );
  const styleMultiplierUsed = styleConfig?.timeMultiplier ?? 1.0;

  const adjustedHours = round2(ai.estimatedHours * styleMultiplierUsed);
  const basePrice = round2(adjustedHours * pricing.hourlyRate);

  let centerPrice = basePrice;
  let appliedMinimum = false;
  if (centerPrice < pricing.minimumPrice) {
    centerPrice = pricing.minimumPrice;
    appliedMinimum = true;
  }

  const spread = centerPrice * pricing.rangeSpreadPct;
  const priceLow = round2(Math.max(pricing.minimumPrice, centerPrice - spread));
  const priceHigh = round2(centerPrice + spread);

  return {
    baseHours: ai.estimatedHours,
    adjustedHours,
    basePrice,
    priceLow,
    priceHigh,
    appliedMinimum,
    styleMultiplierUsed,
  };
}

// ---------------------------------------------------------------------------
// Routing decision: GREEN / YELLOW / RED
// ---------------------------------------------------------------------------

export type RoutingDecision =
  | 'GREEN_AUTO_BOOKABLE'
  | 'YELLOW_ARTIST_REVIEW'
  | 'RED_CONSULTATION_REQUIRED';

export interface BookingRulesInput {
  maxAutoBookDurationMins: number;
  maxAutoBookComplexity: number;
  minAiConfidence: number;
  referenceFreedomMaxForAutoBook: number; // 0-100 slider value
  requireConsultAboveDurationMins: number;
}

export interface RoutingInput {
  estimatedHours: number;
  complexity: number; // 1-10
  aiConfidence: number; // 0-1
  referenceFreedom: number; // 0-100, client slider value
  placementRestricted: boolean; // true if artist restricts this placement
  styleRestricted: boolean;
  subjectMatterRestricted: boolean;
  artistForcedConsultation?: boolean; // manual artist-defined flag
}

/**
 * Decide whether a submission can be auto-booked, needs a quick artist
 * review, or requires a full consultation.
 *
 * Order matters: hard restrictions and artist-forced consults short-circuit
 * straight to RED. Everything else is evaluated against the artist's
 * configured thresholds, falling through to YELLOW if any single condition
 * misses the auto-book bar, or RED if it blows past the hard consult cutoff.
 */
export function decideRouting(
  input: RoutingInput,
  rules: BookingRulesInput
): RoutingDecision {
  const durationMins = input.estimatedHours * 60;

  // Hard stops -> RED
  if (
    input.artistForcedConsultation ||
    input.placementRestricted ||
    input.styleRestricted ||
    input.subjectMatterRestricted ||
    durationMins > rules.requireConsultAboveDurationMins
  ) {
    return 'RED_CONSULTATION_REQUIRED';
  }

  // Check all auto-book conditions
  const meetsAutoBook =
    durationMins <= rules.maxAutoBookDurationMins &&
    input.complexity <= rules.maxAutoBookComplexity &&
    input.aiConfidence >= rules.minAiConfidence &&
    input.referenceFreedom <= rules.referenceFreedomMaxForAutoBook;

  if (meetsAutoBook) {
    return 'GREEN_AUTO_BOOKABLE';
  }

  // Didn't clear auto-book bar but didn't hit a hard RED trigger either
  return 'YELLOW_ARTIST_REVIEW';
}

// ---------------------------------------------------------------------------
// Deposit
// ---------------------------------------------------------------------------

export interface DepositConfigInput {
  depositType: 'FLAT' | 'PERCENT';
  depositFlat?: number | null;
  depositPercent?: number | null;
}

/**
 * Deposit is charged against the low end of the quoted range — the minimum
 * the client is committing to, not the midpoint or high end.
 */
export function calculateDeposit(config: DepositConfigInput, priceLow: number): number {
  if (config.depositType === 'PERCENT') {
    return round2(priceLow * (config.depositPercent ?? 0));
  }
  return config.depositFlat ?? 0;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}
