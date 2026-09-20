import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { BOOKABLE_STATUSES } from "@/lib/bookingStatus";
import { calculateDeposit } from "@/lib/pricingEngine";

const BookingSchema = z.object({
  submissionId: z.string(),
  startTime: z.string(), // ISO string
  type: z.enum(["TATTOO", "CONSULTATION"]).default("TATTOO"),
});

/**
 * Books a slot directly — no payment processing happens here. Tattoo
 * appointments are created with depositPaid: false; the client pays the
 * artist directly (see PricingConfig.depositInstructions) and the artist
 * marks it received from the dashboard.
 */
export async function POST(req: NextRequest) {
  const body = await req.json();
  const parsed = BookingSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid booking request", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const { submissionId, type } = parsed.data;

  const submission = await prisma.submission.findUnique({
    where: { id: submissionId },
    include: { artist: { include: { bookingRules: true, pricingConfig: true } } },
  });

  if (!submission || !submission.artist.bookingRules || !submission.artist.pricingConfig) {
    return NextResponse.json({ error: "Submission not found" }, { status: 404 });
  }

  if (type === "CONSULTATION") {
    if (submission.status !== "RED_CONSULTATION_REQUIRED") {
      return NextResponse.json(
        { error: "This submission is not eligible for a consultation booking" },
        { status: 400 }
      );
    }
  } else if (!BOOKABLE_STATUSES.includes(submission.status)) {
    return NextResponse.json(
      { error: "This submission is not eligible for booking" },
      { status: 400 }
    );
  }

  const durationMins =
    type === "CONSULTATION"
      ? submission.artist.bookingRules.consultationDurationMins
      : Math.round((submission.estimatedHours ?? 1) * 60);
  const startTime = new Date(parsed.data.startTime);
  const endTime = new Date(startTime.getTime() + durationMins * 60_000);

  // Double-check no conflicting appointment slipped in between the client
  // viewing slots and clicking book (a real race condition worth guarding).
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

  let depositAmount: number | null = null;
  if (type === "TATTOO") {
    const priceLow = submission.artistOverridePriceLow ?? submission.estimatedPriceLow;
    depositAmount = priceLow != null ? calculateDeposit(submission.artist.pricingConfig, priceLow) : null;
  }

  const appointment = await prisma.appointment.create({
    data: {
      artistId: submission.artistId,
      clientId: submission.clientId,
      submissionId: submission.id,
      type,
      startTime,
      endTime,
      depositAmount,
    },
  });

  await prisma.submission.update({
    where: { id: submission.id },
    data: { status: "BOOKED" },
  });

  return NextResponse.json({ appointment });
}
