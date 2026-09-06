import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";

const BookingSchema = z.object({
  submissionId: z.string(),
  startTime: z.string(), // ISO string
});

/**
 * Books a free consultation slot directly. Paid tattoo appointments go
 * through /api/checkout + the Stripe webhook instead, so a deposit can't be
 * bypassed by calling this route with a different appointment type.
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

  const submission = await prisma.submission.findUnique({
    where: { id: parsed.data.submissionId },
    include: { artist: { include: { bookingRules: true } } },
  });

  if (!submission || !submission.artist.bookingRules) {
    return NextResponse.json({ error: "Submission not found" }, { status: 404 });
  }

  if (submission.status !== "RED_CONSULTATION_REQUIRED") {
    return NextResponse.json(
      { error: "This submission is not eligible for a consultation booking" },
      { status: 400 }
    );
  }

  const durationMins = submission.artist.bookingRules.consultationDurationMins;
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

  const appointment = await prisma.appointment.create({
    data: {
      artistId: submission.artistId,
      clientId: submission.clientId,
      submissionId: submission.id,
      type: "CONSULTATION",
      startTime,
      endTime,
    },
  });

  await prisma.submission.update({
    where: { id: submission.id },
    data: { status: "BOOKED" },
  });

  return NextResponse.json({ appointment });
}
