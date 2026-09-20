import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { getSessionArtistId } from "@/lib/auth";

const PricingSchema = z.object({
  hourlyRate: z.number().positive(),
  minimumPrice: z.number().nonnegative(),
  rangeSpreadPct: z.number().min(0).max(1),
  depositType: z.enum(["FLAT", "PERCENT"]),
  depositFlat: z.number().nonnegative().nullable(),
  depositPercent: z.number().min(0).max(1).nullable(),
  depositInstructions: z.string().nullable(),
  cancellationPolicy: z.string().nullable(),
});

export async function PATCH(req: NextRequest) {
  const artistId = await getSessionArtistId();
  if (!artistId) {
    return NextResponse.json({ error: "Not logged in" }, { status: 401 });
  }

  const body = await req.json();
  const parsed = PricingSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid pricing config", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const pricingConfig = await prisma.pricingConfig.update({
    where: { artistId },
    data: parsed.data,
  });

  return NextResponse.json({ pricingConfig });
}
