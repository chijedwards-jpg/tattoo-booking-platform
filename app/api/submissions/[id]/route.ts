import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { getSessionArtistId } from "@/lib/auth";
import { sendApprovalEmail } from "@/lib/email";

const UpdateSchema = z.object({
  status: z.enum([
    "GREEN_AUTO_BOOKABLE",
    "YELLOW_ARTIST_REVIEW",
    "RED_CONSULTATION_REQUIRED",
    "APPROVED",
    "DECLINED",
    "BOOKED",
  ]),
  artistOverridePriceLow: z.number().optional(),
  artistOverridePriceHigh: z.number().optional(),
  artistNotes: z.string().optional(),
});

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const artistId = await getSessionArtistId();
  if (!artistId) {
    return NextResponse.json({ error: "Not logged in" }, { status: 401 });
  }

  const existing = await prisma.submission.findUnique({ where: { id: params.id } });
  if (!existing || existing.artistId !== artistId) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const body = await req.json();
  const parsed = UpdateSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid update", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const submission = await prisma.submission.update({
    where: { id: params.id },
    data: parsed.data,
    include: { client: true, artist: true },
  });

  // Approving is the only status change that unblocks the client's booking
  // link — they left the intake flow long before a human reviewed this, so
  // an email is the only way they'd know to come back.
  if (submission.status === "APPROVED") {
    const priceLow = submission.artistOverridePriceLow ?? submission.estimatedPriceLow;
    const priceHigh = submission.artistOverridePriceHigh ?? submission.estimatedPriceHigh;
    if (priceLow != null && priceHigh != null) {
      const bookingUrl = `${process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"}/book/${submission.id}`;
      try {
        await sendApprovalEmail({
          to: submission.client.email,
          artistName: submission.artist.name,
          priceLow,
          priceHigh,
          bookingUrl,
        });
      } catch (err) {
        console.error("Failed to send approval email:", err);
      }
    }
  }

  return NextResponse.json({ submission });
}

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const artistId = await getSessionArtistId();
  if (!artistId) {
    return NextResponse.json({ error: "Not logged in" }, { status: 401 });
  }

  const submission = await prisma.submission.findUnique({
    where: { id: params.id },
    include: { client: true },
  });

  if (!submission || submission.artistId !== artistId) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json({ submission });
}
