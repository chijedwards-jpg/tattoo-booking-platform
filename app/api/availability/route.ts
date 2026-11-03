import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { findOpenSlots } from "@/lib/slots";

export async function GET(req: NextRequest) {
  const submissionId = req.nextUrl.searchParams.get("submissionId");
  const type = req.nextUrl.searchParams.get("type") === "consultation" ? "CONSULTATION" : "TATTOO";

  if (!submissionId) {
    return NextResponse.json({ error: "submissionId is required" }, { status: 400 });
  }

  const submission = await prisma.submission.findUnique({
    where: { id: submissionId },
    include: { artist: { include: { availability: true, bookingRules: true } } },
  });

  if (!submission || !submission.artist.bookingRules) {
    return NextResponse.json({ error: "Submission not found" }, { status: 404 });
  }

  const durationMins =
    type === "CONSULTATION"
      ? submission.artist.bookingRules.consultationDurationMins
      : Math.round((submission.artistOverrideHours ?? submission.estimatedHours ?? 1) * 60);

  const { slots, timeZone } = await findOpenSlots({
    artistId: submission.artistId,
    timeZone: submission.artist.timeZone,
    availability: submission.artist.availability,
    type,
    durationMins,
  });

  return NextResponse.json({
    durationMins,
    timeZone,
    slots: slots.map((s) => ({ start: s.start.toISOString(), end: s.end.toISOString() })),
  });
}
