import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { getSessionArtistId } from "@/lib/auth";

const BookingRulesSchema = z.object({
  maxAutoBookDurationMins: z.number().int().positive(),
  maxAutoBookComplexity: z.number().int().min(1).max(10),
  minAiConfidence: z.number().min(0).max(1),
  referenceFreedomMaxForAutoBook: z.number().int().min(0).max(100),
  requireConsultAboveDurationMins: z.number().int().positive(),
  consultationDurationMins: z.number().int().positive(),
});

export async function PATCH(req: NextRequest) {
  const artistId = await getSessionArtistId();
  if (!artistId) {
    return NextResponse.json({ error: "Not logged in" }, { status: 401 });
  }

  const body = await req.json();
  const parsed = BookingRulesSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid booking rules", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const bookingRules = await prisma.bookingRules.update({
    where: { artistId },
    data: parsed.data,
  });

  return NextResponse.json({ bookingRules });
}
