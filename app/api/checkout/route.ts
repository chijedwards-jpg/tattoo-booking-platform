import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { getStripe } from "@/lib/stripe";
import { BOOKABLE_STATUSES } from "@/lib/bookingStatus";
import { calculateDeposit } from "@/lib/pricingEngine";

const CheckoutSchema = z.object({
  submissionId: z.string(),
  startTime: z.string(), // ISO string
});

/**
 * Starts a Stripe Checkout session for a tattoo appointment's deposit. The
 * Appointment row itself isn't created here — only once the deposit is
 * actually paid, via the checkout.session.completed webhook — so an
 * abandoned checkout never leaves a slot permanently held.
 */
export async function POST(req: NextRequest) {
  const body = await req.json();
  const parsed = CheckoutSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid request", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const submission = await prisma.submission.findUnique({
    where: { id: parsed.data.submissionId },
    include: { artist: { include: { pricingConfig: true } } },
  });

  if (!submission || !submission.artist.pricingConfig) {
    return NextResponse.json({ error: "Submission not found" }, { status: 404 });
  }

  if (!BOOKABLE_STATUSES.includes(submission.status)) {
    return NextResponse.json(
      { error: "This submission is not eligible for booking" },
      { status: 400 }
    );
  }

  const durationMins = Math.round((submission.estimatedHours ?? 1) * 60);
  const startTime = new Date(parsed.data.startTime);
  const endTime = new Date(startTime.getTime() + durationMins * 60_000);

  const conflict = await prisma.appointment.findFirst({
    where: {
      artistId: submission.artistId,
      status: "SCHEDULED",
      startTime: { lt: endTime },
      endTime: { gt: startTime },
    },
  });

  if (conflict) {
    return NextResponse.json(
      { error: "That time was just booked by someone else. Please pick another." },
      { status: 409 }
    );
  }

  const priceLow = submission.artistOverridePriceLow ?? submission.estimatedPriceLow;
  if (priceLow == null) {
    return NextResponse.json({ error: "This submission has no price estimate yet" }, { status: 400 });
  }

  const depositAmount = calculateDeposit(submission.artist.pricingConfig, priceLow);
  if (depositAmount <= 0) {
    return NextResponse.json(
      { error: "This artist hasn't configured a deposit amount" },
      { status: 400 }
    );
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

  let session;
  try {
    const stripe = getStripe();
    session = await stripe.checkout.sessions.create({
      mode: "payment",
      line_items: [
        {
          price_data: {
            currency: "usd",
            product_data: { name: "Tattoo appointment deposit" },
            unit_amount: Math.round(depositAmount * 100),
          },
          quantity: 1,
        },
      ],
      success_url: `${appUrl}/book/${submission.id}?deposit=success`,
      cancel_url: `${appUrl}/book/${submission.id}?deposit=cancelled`,
      metadata: {
        submissionId: submission.id,
        startTime: startTime.toISOString(),
        endTime: endTime.toISOString(),
        depositAmount: depositAmount.toString(),
      },
    });
  } catch (err) {
    console.error("Stripe checkout session creation failed:", err);
    return NextResponse.json({ error: "Couldn't start checkout. Please try again." }, { status: 502 });
  }

  return NextResponse.json({ url: session.url });
}
