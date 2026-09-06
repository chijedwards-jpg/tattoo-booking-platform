import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { prisma } from "@/lib/db";
import { getStripe } from "@/lib/stripe";

export async function POST(req: NextRequest) {
  const signature = req.headers.get("stripe-signature");
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!signature || !webhookSecret) {
    return NextResponse.json({ error: "Webhook not configured" }, { status: 400 });
  }

  const rawBody = await req.text();
  const stripe = getStripe();

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(rawBody, signature, webhookSecret);
  } catch (err) {
    console.error("Stripe webhook signature verification failed:", err);
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  if (event.type === "checkout.session.completed") {
    const session = event.data.object as Stripe.Checkout.Session;
    const { submissionId, startTime, endTime, depositAmount } = session.metadata ?? {};

    if (!submissionId || !startTime || !endTime) {
      console.error("Stripe webhook: checkout session missing booking metadata", session.id);
      return NextResponse.json({ received: true });
    }

    const submission = await prisma.submission.findUnique({ where: { id: submissionId } });

    // Idempotent: Stripe retries webhook delivery, and this submission may
    // already have been booked by a prior delivery of this same event.
    if (!submission || submission.status === "BOOKED") {
      return NextResponse.json({ received: true });
    }

    const conflict = await prisma.appointment.findFirst({
      where: {
        artistId: submission.artistId,
        status: "SCHEDULED",
        startTime: { lt: new Date(endTime) },
        endTime: { gt: new Date(startTime) },
      },
    });

    if (conflict) {
      // The slot was taken by someone else between checkout and payment.
      // The deposit still went through — flag it loudly for the artist to
      // refund and follow up manually rather than silently dropping it.
      console.error(
        `Deposit paid for submission ${submissionId} but its slot is now conflicted — needs manual refund/reschedule`
      );
      return NextResponse.json({ received: true });
    }

    await prisma.appointment.create({
      data: {
        artistId: submission.artistId,
        clientId: submission.clientId,
        submissionId: submission.id,
        type: "TATTOO",
        startTime: new Date(startTime),
        endTime: new Date(endTime),
        depositPaid: true,
        depositAmount: depositAmount ? Number(depositAmount) : null,
        stripePaymentIntentId:
          typeof session.payment_intent === "string" ? session.payment_intent : session.payment_intent?.id,
      },
    });

    await prisma.submission.update({
      where: { id: submission.id },
      data: { status: "BOOKED" },
    });
  }

  return NextResponse.json({ received: true });
}
