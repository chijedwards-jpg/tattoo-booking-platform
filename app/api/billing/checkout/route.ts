import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSessionArtistId } from "@/lib/auth";
import { createSubscriptionCheckoutSession } from "@/lib/stripe";

export async function POST() {
  const artistId = await getSessionArtistId();
  if (!artistId) return NextResponse.json({ error: "Not logged in" }, { status: 401 });

  const artist = await prisma.artist.findUnique({
    where: { id: artistId },
    select: { email: true, stripeCustomerId: true },
  });
  if (!artist) return NextResponse.json({ error: "Not logged in" }, { status: 401 });

  const url = await createSubscriptionCheckoutSession({
    artistId,
    email: artist.email,
    stripeCustomerId: artist.stripeCustomerId,
  });

  return NextResponse.json({ url });
}
