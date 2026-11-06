/**
 * Price calibration: a new artist prices five example tattoos, one per
 * core style, and each price sets that style's multiplier.
 *
 * Pure logic, no DB imports, same as pricingEngine.ts. The example photos
 * live in public/calibration/ and each one's baseline hours were read once
 * from the Gemini analyzer (lib/aiAnalysis.ts) ahead of time, so an artist
 * calibrating never triggers an AI call or waits for one.
 */

export interface CalibrationExample {
  id: string;
  style: string; // must match a TattooStyle name
  image: string; // public path
  size: string; // shown to the artist so they price the right scale
  placement: string;
  baselineHours: number; // the analyzer's read, before any multiplier
  credit: {
    author: string;
    license: string;
    licenseUrl: string | null;
    sourceUrl: string;
  };
}

export const CALIBRATION_EXAMPLES: CalibrationExample[] = [
  {
    id: "minimalist",
    style: "Minimalist",
    image: "/calibration/minimalist.jpg",
    size: "Palm-sized, about 3-4 inches",
    placement: "Upper arm",
    baselineHours: 1,
    credit: {
      author: "Bruno Antonio Menei",
      license: "CC BY 4.0",
      licenseUrl: "https://creativecommons.org/licenses/by/4.0",
      sourceUrl: "https://commons.wikimedia.org/wiki/File:Minimalist_tattoo,_Bruno_Antonio_Menei,_Inksecte,_Belgium.jpg",
    },
  },
  {
    id: "traditional",
    style: "Traditional",
    image: "/calibration/traditional.jpg",
    size: "Hand-sized, about 7-9 inches",
    placement: "Thigh",
    baselineHours: 3.5,
    credit: {
      author: "Brandon Richardson, U.S. Navy",
      license: "Public domain",
      licenseUrl: null,
      sourceUrl: "https://commons.wikimedia.org/wiki/File:US_Navy_eagle_tattoo_in_traditional_style.jpg",
    },
  },
  {
    id: "black-grey",
    style: "Black & Grey",
    image: "/calibration/black-grey.jpg",
    size: "Larger than a hand, most of the forearm",
    placement: "Forearm",
    baselineHours: 6,
    credit: {
      author: "Gypates",
      license: "CC BY 4.0",
      licenseUrl: "https://creativecommons.org/licenses/by/4.0",
      sourceUrl: "https://commons.wikimedia.org/wiki/File:Fox_Tattoo_Done_In_Belfast_Northern_Ireland.jpg",
    },
  },
  {
    id: "color",
    style: "Color",
    image: "/calibration/color.jpg",
    size: "Hand-sized, about 7-9 inches",
    placement: "Forearm",
    baselineHours: 3.5,
    credit: {
      author: "Kelly and Cassandra Gatelein",
      license: "CC0",
      licenseUrl: "https://creativecommons.org/publicdomain/zero/1.0",
      sourceUrl: "https://commons.wikimedia.org/wiki/File:Semi-minimalist_Knight_of_Swords.jpg",
    },
  },
  {
    id: "realism",
    style: "Realism",
    image: "/calibration/realism.jpg",
    size: "Hand-sized, about 7-9 inches",
    placement: "Forearm",
    // Estimated by hand: the analyzer was rate-limited for this photo.
    // Replace with its read when quota allows (the larger fox piece read 6).
    baselineHours: 5,
    credit: {
      author: "Gypates",
      license: "CC BY 4.0",
      licenseUrl: "https://creativecommons.org/licenses/by/4.0",
      sourceUrl: "https://commons.wikimedia.org/wiki/File:Tiger_tattoo_in_Belfast_Northern_Ireland.jpg",
    },
  },
];

// Styles the analyzer can detect that have no example of their own follow
// the closest one. "Other" is left alone on purpose.
export const STYLE_FOLLOWS: Record<string, string> = {
  "Fine Line": "minimalist",
  Linework: "minimalist",
  Lettering: "minimalist",
  "Neo-traditional": "traditional",
  Japanese: "traditional",
  Blackwork: "black-grey",
  Geometric: "black-grey",
  Illustrative: "color",
  "Micro Realism": "realism",
};

// Keeps one odd price (a typo, a friend discount) from producing an
// estimate that's wildly off for every future client in that style.
export const MIN_MULTIPLIER = 0.5;
export const MAX_MULTIPLIER = 2.5;

/**
 * price = baseline hours x hourly rate x multiplier, solved for the
 * multiplier. The same formula holds in both TIME and PRICE mode, since
 * either way the estimate before the minimum-price floor is
 * hours x rate x multiplier. Rounded to the nearest 0.05 so it reads
 * cleanly in settings.
 */
export function multiplierFromPrice(price: number, baselineHours: number, hourlyRate: number): number {
  if (!(price > 0) || !(baselineHours > 0) || !(hourlyRate > 0)) return 1;
  const raw = price / (baselineHours * hourlyRate);
  const clamped = Math.min(MAX_MULTIPLIER, Math.max(MIN_MULTIPLIER, raw));
  return Math.round(clamped * 20) / 20;
}

export interface PriceRange {
  low: number;
  high: number;
}

// Range edges as multiples of the artist's own hours x rate. The middle
// option brackets exactly what their stated time would cost at their rate;
// the others cover charging under it (quick work, simple pieces) or over
// it (a premium for the style).
const RANGE_EDGES = [0.65, 0.8, 0.93, 1.07, 1.2, 1.35, 1.55];

function roundMoney(n: number, base: number): number {
  const step = base < 200 ? 5 : base < 600 ? 10 : base < 2000 ? 25 : 50;
  return Math.round(n / step) * step;
}

/**
 * The price ranges an artist picks from for one example, once they've said
 * how long it would take them. Built around their hours x hourly rate so
 * the choices are already in their ballpark.
 */
export function priceRangeOptions(hours: number, hourlyRate: number): PriceRange[] {
  if (!(hours > 0) || !(hourlyRate > 0)) return [];
  const base = hours * hourlyRate;
  const edges = RANGE_EDGES.map((e) => roundMoney(base * e, base));
  const out: PriceRange[] = [];
  for (let i = 0; i < edges.length - 1; i++) {
    if (edges[i + 1] > edges[i]) out.push({ low: edges[i], high: edges[i + 1] });
  }
  return out;
}

/** The price a range calibrates to: its midpoint. */
export function rangeMidpoint(range: PriceRange): number {
  return (range.low + range.high) / 2;
}

export interface CalibratedStyle {
  style: string;
  multiplier: number;
  fromExample: string; // example id this came from
}

/**
 * Every style that should change: one per priced example, plus the styles
 * that follow it. Examples left blank are skipped, and so are the styles
 * that follow them.
 */
export function calibrateStyles(
  prices: Record<string, number | null | undefined>,
  hourlyRate: number
): CalibratedStyle[] {
  const byExample = new Map<string, number>();
  for (const ex of CALIBRATION_EXAMPLES) {
    const price = prices[ex.id];
    if (price == null || !(price > 0)) continue;
    byExample.set(ex.id, multiplierFromPrice(price, ex.baselineHours, hourlyRate));
  }

  const result: CalibratedStyle[] = [];
  for (const ex of CALIBRATION_EXAMPLES) {
    const m = byExample.get(ex.id);
    if (m !== undefined) result.push({ style: ex.style, multiplier: m, fromExample: ex.id });
  }
  for (const [style, exampleId] of Object.entries(STYLE_FOLLOWS)) {
    const m = byExample.get(exampleId);
    if (m !== undefined) result.push({ style, multiplier: m, fromExample: exampleId });
  }
  return result;
}
