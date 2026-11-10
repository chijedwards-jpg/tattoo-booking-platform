import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { sendReminderEmail, sendReviewRequestEmail } from "@/lib/email";
import { DEFAULT_TIME_ZONE } from "@/lib/timeZones";
import {
  calendarDaysUntil,
  clientLink,
  newClientToken,
  reminderDecision,
  REMINDER_DAY_OPTIONS,
  REVIEW_REQUEST_WINDOW_MS,
} from "@/lib/reminders";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * Daily job (vercel.json "crons"): emails appointment reminders on the days
 * each artist picked, and review requests once a tattoo is done.
 *
 * Safe to run more than once a day: every send is claimed in the database
 * first (remindersSentDays / reviewRequestedAt), so a repeat run — or anyone
 * else hitting this URL — can't send a client the same email twice. When
 * CRON_SECRET is set, Vercel sends it as a bearer token and everything
 * else is turned away.
 */
export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (secret && req.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const now = new Date();
  let remindersSent = 0;
  let reviewRequestsSent = 0;
  let failures = 0;

  // -- Reminders -----------------------------------------------------------
  const maxDays = Math.max(...REMINDER_DAY_OPTIONS);
  const upcoming = await prisma.appointment.findMany({
    where: {
      status: "SCHEDULED",
      confirmationStatus: { not: "RESCHEDULE_REQUESTED" },
      startTime: { gt: now, lt: new Date(now.getTime() + (maxDays + 1) * DAY_MS) },
    },
    include: { client: true, artist: { include: { bookingRules: true, pricingConfig: true } } },
  });

  for (const appt of upcoming) {
    const timeZone = appt.artist.timeZone ?? DEFAULT_TIME_ZONE;
    const decision = reminderDecision({
      startTime: appt.startTime,
      createdAt: appt.createdAt,
      now,
      timeZone,
      reminderDaysBefore: appt.artist.bookingRules?.reminderDaysBefore ?? [],
      remindersSentDays: appt.remindersSentDays,
    });
    if (decision.markSent.length === 0) continue;

    const token = appt.clientToken ?? newClientToken();
    const claimed = await prisma.appointment.updateMany({
      where: { id: appt.id, remindersSentDays: { equals: appt.remindersSentDays } },
      data: { remindersSentDays: [...appt.remindersSentDays, ...decision.markSent], clientToken: token },
    });
    if (claimed.count === 0 || !decision.send) continue;

    const depositDue =
      appt.type === "TATTOO" && !appt.depositPaid && appt.depositAmount != null && appt.depositAmount > 0
        ? { amount: appt.depositAmount, instructions: appt.artist.pricingConfig?.depositInstructions ?? null }
        : null;

    try {
      await sendReminderEmail({
        to: appt.client.email,
        artistName: appt.artist.name,
        type: appt.type,
        startTime: appt.startTime,
        timeZone,
        daysUntil: calendarDaysUntil(appt.startTime, now, timeZone),
        confirmed: appt.confirmationStatus === "CONFIRMED",
        confirmUrl: clientLink(token),
        depositDue,
        log: { artistId: appt.artistId, clientId: appt.clientId, appointmentId: appt.id, kind: "REMINDER" },
      });
      remindersSent++;
    } catch (err) {
      failures++;
      console.error(`Failed to send reminder for appointment ${appt.id}:`, err);
    }
  }

  // -- Review requests -----------------------------------------------------
  const finished = await prisma.appointment.findMany({
    where: {
      type: "TATTOO",
      status: { in: ["SCHEDULED", "COMPLETED"] },
      endTime: { lte: now, gt: new Date(now.getTime() - REVIEW_REQUEST_WINDOW_MS) },
      reviewRequestedAt: null,
      review: { is: null },
      artist: { bookingRules: { is: { sendReviewRequests: true } } },
    },
    include: { client: true, artist: true },
  });

  for (const appt of finished) {
    const token = appt.clientToken ?? newClientToken();
    const claimed = await prisma.appointment.updateMany({
      where: { id: appt.id, reviewRequestedAt: null },
      data: { reviewRequestedAt: now, clientToken: token },
    });
    if (claimed.count === 0) continue;

    try {
      await sendReviewRequestEmail({
        to: appt.client.email,
        artistName: appt.artist.name,
        reviewUrl: clientLink(token),
        log: { artistId: appt.artistId, clientId: appt.clientId, appointmentId: appt.id, kind: "REVIEW_REQUEST" },
      });
      reviewRequestsSent++;
    } catch (err) {
      failures++;
      console.error(`Failed to send review request for appointment ${appt.id}:`, err);
    }
  }

  return NextResponse.json({ remindersSent, reviewRequestsSent, failures });
}
