import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { getSessionArtistId } from "@/lib/auth";
import { deleteGoogleCalendarEvent } from "@/lib/googleOAuth";
import { sendAppointmentCancelledEmail } from "@/lib/email";
import { appUrl } from "@/lib/reminders";
import { DEFAULT_TIME_ZONE } from "@/lib/timeZones";

const UpdateSchema = z.object({
  action: z.enum(["MARK_DEPOSIT_RECEIVED", "CANCEL", "MARK_COMPLETED", "MARK_NO_SHOW"]),
});

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const artistId = await getSessionArtistId();
  if (!artistId) {
    return NextResponse.json({ error: "Not logged in" }, { status: 401 });
  }

  const appointment = await prisma.appointment.findUnique({
    where: { id: params.id },
    include: { client: true, artist: true },
  });
  if (!appointment || appointment.artistId !== artistId) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const parsed = UpdateSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid request", details: parsed.error.flatten() },
      { status: 400 }
    );
  }
  const { action } = parsed.data;

  if (action === "MARK_DEPOSIT_RECEIVED") {
    const updated = await prisma.appointment.update({
      where: { id: params.id },
      data: { depositPaid: true },
    });
    return NextResponse.json({ appointment: updated });
  }

  // Everything below changes what happened to the appointment, which only
  // makes sense while it's still scheduled.
  if (appointment.status !== "SCHEDULED") {
    return NextResponse.json({ error: "This appointment was already closed out." }, { status: 409 });
  }

  if (action === "MARK_COMPLETED" || action === "MARK_NO_SHOW") {
    if (appointment.startTime > new Date()) {
      return NextResponse.json({ error: "This appointment hasn't happened yet." }, { status: 400 });
    }
    const updated = await prisma.appointment.update({
      where: { id: params.id },
      data: { status: action === "MARK_COMPLETED" ? "COMPLETED" : "NO_SHOW" },
    });
    return NextResponse.json({ appointment: updated });
  }

  // CANCEL — free the slot and let the client come back through their
  // booking link to pick a new one.
  const updated = await prisma.appointment.update({
    where: { id: params.id },
    data: { status: "CANCELLED" },
  });

  if (appointment.googleEventId) {
    await deleteGoogleCalendarEvent(appointment.artistId, appointment.googleEventId);
  }

  if (appointment.submissionId) {
    await prisma.submission.update({
      where: { id: appointment.submissionId },
      data: {
        status: appointment.type === "CONSULTATION" ? "RED_CONSULTATION_REQUIRED" : "APPROVED",
      },
    });

    // Without this the client only finds out when they show up. Only for
    // appointments still ahead — a past one being tidied up needs no email.
    if (appointment.startTime > new Date()) {
      try {
        await sendAppointmentCancelledEmail({
          to: appointment.client.email,
          artistName: appointment.artist.name,
          type: appointment.type,
          startTime: appointment.startTime,
          timeZone: appointment.artist.timeZone ?? DEFAULT_TIME_ZONE,
          rebookUrl: `${appUrl()}/book/${appointment.submissionId}`,
        });
      } catch (err) {
        console.error("Failed to email client about cancellation:", err);
      }
    }
  }

  return NextResponse.json({ appointment: updated });
}
