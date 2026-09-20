import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { analyzeInspirationImage } from "@/lib/aiAnalysis";
import { calculateEstimate, decideRouting, calculateDeposit } from "@/lib/pricingEngine";

const SubmissionSchema = z.object({
  artistSlug: z.string(),
  clientEmail: z.string().email(),
  clientName: z.string().optional(),
  clientPhone: z.string().optional(),

  // data:image/jpeg;base64,... — sent straight from the browser's file input
  inspirationImageDataUrl: z.string(),
  placement: z.string(),
  sizeInches: z.number().optional(),
  sizePreset: z.string().optional(),
  referenceFreedom: z.number().min(0).max(100),
  description: z.string().optional(),
});

export async function POST(req: NextRequest) {
  const body = await req.json();
  const parsed = SubmissionSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid submission", details: parsed.error.flatten() },
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

  // --- Find or create client ----------------------------------------------

  const client = await prisma.client.upsert({
    where: { email: input.clientEmail },
    update: { name: input.clientName, phone: input.clientPhone },
    create: {
      email: input.clientEmail,
      name: input.clientName,
      phone: input.clientPhone,
    },
  });

  // --- Parse the data URL into base64 + media type ------------------------

  const match = input.inspirationImageDataUrl.match(/^data:(image\/\w+);base64,(.+)$/);
  if (!match) {
    return NextResponse.json({ error: "Invalid image data" }, { status: 400 });
  }
  const [, mimeType, base64Data] = match;

  // --- Run AI analysis ------------------------------------------------------

  let aiResult;
  try {
    aiResult = await analyzeInspirationImage({
      base64Image: base64Data,
      mediaType: mimeType as "image/jpeg" | "image/png" | "image/webp",
      description: input.description,
      sizeInches: input.sizeInches,
    });
  } catch (err) {
    console.error("AI analysis failed:", err);
    return NextResponse.json(
      { error: "AI analysis failed. Please try again." },
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
    artist.styles.map((s) => ({ name: s.name, timeMultiplier: s.timeMultiplier }))
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
    },
    {
      maxAutoBookDurationMins: artist.bookingRules.maxAutoBookDurationMins,
      maxAutoBookComplexity: artist.bookingRules.maxAutoBookComplexity,
      minAiConfidence: artist.bookingRules.minAiConfidence,
      referenceFreedomMaxForAutoBook: artist.bookingRules.referenceFreedomMaxForAutoBook,
      requireConsultAboveDurationMins: artist.bookingRules.requireConsultAboveDurationMins,
    }
  );

  // --- Save submission ------------------------------------------------------

  const submission = await prisma.submission.create({
    data: {
      artistId: artist.id,
      clientId: client.id,
      inspirationImages: [input.inspirationImageDataUrl],
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

      estimatedPriceLow: estimate.priceLow,
      estimatedPriceHigh: estimate.priceHigh,
      estimatedHours: estimate.adjustedHours,

      status: routing,
    },
  });

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
