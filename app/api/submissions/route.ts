import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { analyzeInspirationImage } from "@/lib/aiAnalysis";
import { calculateEstimate, decideRouting, calculateDeposit } from "@/lib/pricingEngine";
import { sendSubmissionReceivedEmail } from "@/lib/email";
import { checkRateLimit, getClientIp } from "@/lib/rateLimit";

// ~8MB of actual image data, base64-encoded (base64 runs ~4/3 the size of
// the original bytes) — generous for a phone photo, but bounds how much a
// single request can push through a billed Gemini call and into a Postgres
// row (inspirationImages is stored as plain text, not a file upload).
const MAX_BASE64_IMAGE_LENGTH = 8 * 1024 * 1024 * 1.4;
const MAX_IMAGES = 5;

// The formats the request form offers (HEIC straight from iPhones), all of
// which the image analyzer reads. Anything else (GIFs, SVGs) used to get
// "analyzed" anyway and priced as an invented tattoo.
const IMAGE_DATA_URL = /^data:image\/(jpeg|png|webp|heic|heif);base64,/;

const SubmissionSchema = z.object({
  artistSlug: z.string().max(100),
  clientEmail: z.string().trim().email("Please enter a valid email").max(200),
  // Empty strings from an untouched form field mean "not given".
  clientName: z.string().trim().max(100).optional().transform((s) => s || undefined),
  clientPhone: z.string().trim().max(30).optional().transform((s) => s || undefined),

  // data:image/jpeg;base64,... — sent straight from the browser's file input
  inspirationImageDataUrls: z
    .array(
      z
        .string()
        .max(MAX_BASE64_IMAGE_LENGTH, "Image is too large")
        .regex(IMAGE_DATA_URL, "Please upload a JPEG, PNG, WebP or HEIC photo")
    )
    .min(1)
    .max(MAX_IMAGES),
  placement: z.string().trim().min(1).max(60),
  sizeInches: z.number().positive("Size must be more than 0 inches").max(120).optional(),
  sizePreset: z.string().max(20).optional(),
  referenceFreedom: z.number().min(0).max(100),
  description: z.string().trim().max(2000, "Please keep your notes under 2000 characters").optional(),
});

// Each submission triggers a billed Gemini call and an email send, and the
// endpoint has no auth — without a limit, a script could run up API costs
// and spam every artist's dashboard with fake requests.
const RATE_LIMIT = 8;
const RATE_WINDOW_MS = 60 * 60 * 1000;

export async function POST(req: NextRequest) {
  if (!checkRateLimit(`submissions:${getClientIp(req)}`, RATE_LIMIT, RATE_WINDOW_MS)) {
    return NextResponse.json(
      { error: "Too many requests. Please try again later." },
      { status: 429 }
    );
  }

  const body = await req.json();
  const parsed = SubmissionSchema.safeParse(body);

  if (!parsed.success) {
    // The first message is written for the client — the form shows it as is.
    return NextResponse.json(
      { error: parsed.error.errors[0]?.message ?? "Invalid submission", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const input = parsed.data;

  // --- Look up artist + config -------------------------------------------

  const artist = await prisma.artist.findUnique({
    where: { slug: input.artistSlug },
    include: { pricingConfig: true, bookingRules: true, styles: true, restrictions: true },
  });

  if (!artist || !artist.pricingConfig || !artist.bookingRules) {
    return NextResponse.json(
      { error: "Artist not found or not fully configured" },
      { status: 404 }
    );
  }

  // --- Parse the data URL into base64 + media type ------------------------

  const images = [];
  for (const dataUrl of input.inspirationImageDataUrls) {
    const match = dataUrl.match(/^data:(image\/\w+);base64,(.+)$/);
    if (!match) {
      return NextResponse.json({ error: "Invalid image data" }, { status: 400 });
    }
    images.push({
      mediaType: match[1] as "image/jpeg" | "image/png" | "image/webp" | "image/heic" | "image/heif",
      base64Image: match[2],
    });
  }

  // --- Run image analysis ------------------------------------------------------

  let aiResult;
  try {
    aiResult = await analyzeInspirationImage({
      images,
      description: input.description,
      sizeInches: input.sizeInches,
      sizePreset: input.sizePreset,
      placement: input.placement,
    });
  } catch (err) {
    console.error("Image analysis failed:", err);
    return NextResponse.json(
      { error: "Couldn't analyze your image. Please try again." },
      { status: 502 }
    );
  }

  // --- Calculate price estimate ---------------------------------------------

  const estimate = calculateEstimate(
    aiResult,
    {
      hourlyRate: artist.pricingConfig.hourlyRate,
      minimumPrice: artist.pricingConfig.minimumPrice,
      rangeSpreadPct: artist.pricingConfig.rangeSpreadPct,
    },
    artist.styles.map((s) => ({ name: s.name, multiplier: s.multiplier })),
    artist.pricingConfig.styleMultiplierMode
  );

  // --- Check artist restrictions --------------------------------------------

  const placementRestricted = artist.restrictions.some(
    (r) => r.type === "PLACEMENT" && r.value.toLowerCase() === input.placement.toLowerCase()
  );
  const styleRestricted = artist.restrictions.some(
    (r) => r.type === "STYLE" && r.value.toLowerCase() === aiResult.detectedStyle.toLowerCase()
  );

  // --- Decide routing ---------------------------------------------------------

  const routing = decideRouting(
    {
      estimatedHours: estimate.adjustedHours,
      complexity: aiResult.complexity,
      aiConfidence: aiResult.confidence,
      referenceFreedom: input.referenceFreedom,
      placementRestricted,
      styleRestricted,
      subjectMatterRestricted: false, // no subject-matter detection yet
      commentNeedsConsultation: aiResult.needsConsultation,
    },
    {
      maxAutoBookDurationMins: artist.bookingRules.maxAutoBookDurationMins,
      maxAutoBookComplexity: artist.bookingRules.maxAutoBookComplexity,
      minAiConfidence: artist.bookingRules.minAiConfidence,
      referenceFreedomMaxForAutoBook: artist.bookingRules.referenceFreedomMaxForAutoBook,
      requireConsultAboveDurationMins: artist.bookingRules.requireConsultAboveDurationMins,
    }
  );

  // --- Find or create client ----------------------------------------------
  // Only now that the request is valid and analyzed — a rejected request
  // shouldn't leave a client with no requests in the artist's Clients list.

  const client = await prisma.client.upsert({
    where: { email: input.clientEmail },
    update: { name: input.clientName, phone: input.clientPhone },
    create: {
      email: input.clientEmail,
      name: input.clientName,
      phone: input.clientPhone,
    },
  });

  // --- Save submission ------------------------------------------------------

  const submission = await prisma.submission.create({
    data: {
      artistId: artist.id,
      clientId: client.id,
      inspirationImages: input.inspirationImageDataUrls,
      description: input.description,
      placement: input.placement,
      sizeInches: input.sizeInches,
      sizePreset: input.sizePreset,
      referenceFreedom: input.referenceFreedom,

      aiDetectedStyle: aiResult.detectedStyle,
      aiComplexity: aiResult.complexity,
      aiEstimatedHours: aiResult.estimatedHours,
      aiConfidence: aiResult.confidence,
      aiColorVsBW: aiResult.colorVsBW,
      aiRawAnalysis: {
        needsConsultation: aiResult.needsConsultation,
        consultationReason: aiResult.consultationReason,
      },

      estimatedPriceLow: estimate.priceLow,
      estimatedPriceHigh: estimate.priceHigh,
      estimatedHours: estimate.adjustedHours,

      status: routing,
    },
  });

  // Fire-and-forget-but-logged: a flaky email provider shouldn't turn a
  // successful submission into a 502 for the client.
  try {
    await sendSubmissionReceivedEmail({
      to: client.email,
      artistName: artist.name,
      status: routing,
      priceLow: estimate.priceLow,
      priceHigh: estimate.priceHigh,
      log: { artistId: artist.id, clientId: client.id, kind: "REQUEST_RECEIVED" },
    });
  } catch (err) {
    console.error("Failed to send submission-received email:", err);
  }

  return NextResponse.json({
    submissionId: submission.id,
    status: routing,
    estimate: {
      priceLow: estimate.priceLow,
      priceHigh: estimate.priceHigh,
      hours: estimate.adjustedHours,
    },
    deposit: {
      amount: calculateDeposit(artist.pricingConfig, estimate.priceLow),
      instructions: artist.pricingConfig.depositInstructions,
    },
    detectedStyle: aiResult.detectedStyle,
  });
}
