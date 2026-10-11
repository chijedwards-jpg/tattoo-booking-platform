import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSessionArtistId } from "@/lib/auth";
import { createBillingPortalSession } from "@/lib/stripe";

export async function POST() {
  const artistId = await getSessionArtistId();
  if (!artistId) return NextResponse.json({ error: "Not logged in" }, { status: 401 });

  const artist = await prisma.artist.findUnique({
    where: { id: artistId },
    select: { stripeCustomerId: true },
  });
  if (!artist?.stripeCustomerId) {
    return NextResponse.json({ error: "No billing account yet" }, { status: 400 });
  }

  const url = await createBillingPortalSession(artist.stripeCustomerId);
  return NextResponse.json({ url });
}
