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
    const before = await prisma.artist.findUnique({
      where: { id: artistId },
      select: { stripeSubscriptionId: true },
    });
    await prisma.artist.update({
      where: { id: artistId },
      data: {
        stripeCustomerId: checkoutSession.customer,
        stripeSubscriptionId: subscription.id,
        stripeSubscriptionStatus: subscription.status,
      },
    });

    // First subscription ever: a brand-new artist, so walk them through
    // pricing the example tattoos before they land on an empty dashboard.
    // Resubscribing artists already have their prices set up.
    if (!before?.stripeSubscriptionId) {
      return NextResponse.redirect(new URL("/dashboard/settings/styles/calibrate?welcome=1", req.url));
    }
  }

  return NextResponse.redirect(new URL("/dashboard", req.url));
}
