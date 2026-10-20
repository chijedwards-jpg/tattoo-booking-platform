import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { getSessionArtistId } from "@/lib/auth";

const UpdateSchema = z.object({
  mode: z.enum(["TIME", "PRICE"]),
});

export async function PATCH(req: NextRequest) {
  const artistId = await getSessionArtistId();
  if (!artistId) {
    return NextResponse.json({ error: "Not logged in" }, { status: 401 });
  }

  const body = await req.json();
  const parsed = UpdateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const pricingConfig = await prisma.pricingConfig.update({
    where: { artistId },
    data: { styleMultiplierMode: parsed.data.mode },
  });

  return NextResponse.json({ styleMultiplierMode: pricingConfig.styleMultiplierMode });
}
