import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { calculateAvailableSlots } from "@/lib/availability";
import { fetchGoogleBusyIntervals } from "@/lib/googleOAuth";

const SLOT_SEARCH_DAYS_AHEAD = 14; // must match calculateAvailableSlots' own default

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
      : Math.round((submission.estimatedHours ?? 1) * 60);

  const windows = submission.artist.availability
    .filter((a) => a.type === type && a.dayOfWeek !== null)
    .map((a) => ({
      dayOfWeek: a.dayOfWeek as number,
      startTime: a.startTime,
      endTime: a.endTime,
    }));

  // An artist can't be double-booked regardless of appointment type, so
  // consultation slots need to steer clear of scheduled tattoo appointments
  // (and vice versa) — no type filter here on purpose.
  const existingAppointments = await prisma.appointment.findMany({
    where: { artistId: submission.artistId, status: "SCHEDULED" },
  });

  // Also fold in the artist's real Google Calendar busy times, if they've
  // connected one — a personal dentist appointment shouldn't be offered to
  // a client as a bookable slot. Fails open to [] on any error (not
  // connected, revoked access, Google API hiccup) rather than breaking
  // availability entirely; see fetchGoogleBusyIntervals.
  const now = new Date();
  const searchEnd = new Date(now);
  searchEnd.setDate(searchEnd.getDate() + SLOT_SEARCH_DAYS_AHEAD);
  const googleBusy = await fetchGoogleBusyIntervals(submission.artistId, now, searchEnd);

  const slots = calculateAvailableSlots({
    weeklyAvailability: windows,
    busy: [
      ...existingAppointments.map((a) => ({ start: a.startTime, end: a.endTime })),
      ...googleBusy,
    ],
    durationMins,
  });

  return NextResponse.json({
    durationMins,
    slots: slots.map((s) => ({ start: s.start.toISOString(), end: s.end.toISOString() })),
  });
}
