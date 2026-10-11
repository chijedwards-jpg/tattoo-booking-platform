import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSessionArtistId } from "@/lib/auth";
import { getStripe } from "@/lib/stripe";

// Lands here straight from Stripe Checkout's success_url. No webhook is
// wired up yet (see SETUP.md), so this is currently the only place a new
// subscription's status gets written — later status changes (renewal,
// cancellation, failed payment) won't update until a webhook is added.
export async function GET(req: NextRequest) {
  const sessionId = req.nextUrl.searchParams.get("session_id");
  const artistId = await getSessionArtistId();
  if (!artistId) return NextResponse.redirect(new URL("/login", req.url));
  if (!sessionId) return NextResponse.redirect(new URL("/dashboard", req.url));

  const checkoutSession = await getStripe().checkout.sessions.retrieve(sessionId, {
    expand: ["subscription"],
  });

  if (checkoutSession.client_reference_id !== artistId) {
    return NextResponse.redirect(new URL("/dashboard", req.url));
  }

  const subscription = checkoutSession.subscription;
  if (subscription && typeof subscription !== "string" && typeof checkoutSession.customer === "string") {
    await prisma.artist.update({
      where: { id: artistId },
      data: {
        stripeCustomerId: checkoutSession.customer,
        stripeSubscriptionId: subscription.id,
        stripeSubscriptionStatus: subscription.status,
      },
    });
  }

  return NextResponse.redirect(new URL("/dashboard", req.url));
}
