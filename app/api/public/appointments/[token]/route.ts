import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { checkRateLimit, getClientIp } from "@/lib/rateLimit";
import { sendRescheduleRequestToArtist } from "@/lib/email";
import { DEFAULT_TIME_ZONE } from "@/lib/timeZones";
import { appUrl } from "@/lib/reminders";

const ActionSchema = z.object({
  action: z.enum(["CONFIRM", "RESCHEDULE"]),
  note: z.string().trim().max(500).optional(),
});

/** Client confirms, or asks to reschedule, through the link in their email. */
export async function POST(req: NextRequest, { params }: { params: { token: string } }) {
  if (!checkRateLimit(`client-confirm:${getClientIp(req)}`, 20, 60 * 60 * 1000)) {
    return NextResponse.json({ error: "Too many tries. Please wait a bit." }, { status: 429 });
  }

  const parsed = ActionSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const appt = await prisma.appointment.findUnique({
    where: { clientToken: params.token },
    include: { artist: true, client: true },
  });
  if (!appt) {
    return NextResponse.json({ error: "Appointment not found" }, { status: 404 });
  }
  if (appt.status !== "SCHEDULED" || appt.endTime <= new Date()) {
    return NextResponse.json({ error: "This appointment can't be changed anymore." }, { status: 400 });
  }

  if (parsed.data.action === "CONFIRM") {
    await prisma.appointment.update({
      where: { id: appt.id },
      data: { confirmationStatus: "CONFIRMED", confirmedAt: new Date(), confirmationNote: null },
    });
    return NextResponse.json({ ok: true });
  }

  const note = parsed.data.note || null;
  await prisma.appointment.update({
    where: { id: appt.id },
    data: { confirmationStatus: "RESCHEDULE_REQUESTED", confirmationNote: note },
  });

  // Only tell the artist the first time — a client clicking twice
  // shouldn't send two emails.
  if (appt.confirmationStatus !== "RESCHEDULE_REQUESTED") {
    try {
      await sendRescheduleRequestToArtist({
        to: appt.artist.email,
        clientLabel: appt.client.name || appt.client.email,
        startTime: appt.startTime,
        timeZone: appt.artist.timeZone ?? DEFAULT_TIME_ZONE,
        note,
        clientPageUrl: `${appUrl()}/dashboard/clients/${appt.clientId}`,
      });
    } catch (err) {
      console.error("Failed to email artist about reschedule request:", err);
    }
  }

  return NextResponse.json({ ok: true });
}
