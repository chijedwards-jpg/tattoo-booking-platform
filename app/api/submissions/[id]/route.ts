import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { getSessionArtistId } from "@/lib/auth";
import { sendApprovalEmail, sendConsultationRequiredEmail, sendRequestDeclinedEmail } from "@/lib/email";
import { appUrl } from "@/lib/reminders";

const UpdateSchema = z
  .object({
    status: z.enum([
      "GREEN_AUTO_BOOKABLE",
      "YELLOW_ARTIST_REVIEW",
      "RED_CONSULTATION_REQUIRED",
      "APPROVED",
      "DECLINED",
    ]),
    artistOverridePriceLow: z.number().nonnegative("Prices can't be negative").max(100_000).optional(),
    artistOverridePriceHigh: z.number().nonnegative("Prices can't be negative").max(100_000).optional(),
    artistOverrideHours: z.number().positive("Hours must be more than 0").max(24).optional(),
    artistNotes: z.string().max(5000).optional(),
  })
  .refine(
    (d) =>
      d.artistOverridePriceLow == null ||
      d.artistOverridePriceHigh == null ||
      d.artistOverridePriceLow <= d.artistOverridePriceHigh,
    { message: "The low price can't be higher than the high price" }
  );

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const artistId = await getSessionArtistId();
  if (!artistId) {
    return NextResponse.json({ error: "Not logged in" }, { status: 401 });
  }

  const existing = await prisma.submission.findUnique({ where: { id: params.id } });
  if (!existing || existing.artistId !== artistId) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  // A booked request already has an appointment tied to it. Changing its
  // status would reopen the booking link and let the client book a second
  // slot for the same request (which then fails on the one-appointment
  // rule). Cancelling the appointment is the way to reopen it.
  if (existing.status === "BOOKED") {
    return NextResponse.json(
      { error: "This request is already booked. Cancel the appointment first to change it." },
      { status: 409 }
    );
  }

  const parsed = UpdateSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.errors[0]?.message ?? "Invalid update", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const submission = await prisma.submission.update({
    where: { id: params.id },
    data: parsed.data,
    include: { client: true, artist: true },
  });

  // The client left the request form long before a human reviewed this, so
  // an email is the only way they hear the outcome. Only on an actual change,
  // so re-saving the same status doesn't email them again.
  const changed = existing.status !== submission.status;
  const bookingUrl = `${appUrl()}/book/${submission.id}`;
  try {
    if (submission.status === "APPROVED" && (changed || parsed.data.artistOverridePriceLow != null)) {
      const priceLow = submission.artistOverridePriceLow ?? submission.estimatedPriceLow;
      const priceHigh = submission.artistOverridePriceHigh ?? submission.estimatedPriceHigh;
      if (priceLow != null && priceHigh != null) {
        await sendApprovalEmail({
          to: submission.client.email,
          artistName: submission.artist.name,
          priceLow,
          priceHigh,
          bookingUrl,
          log: { artistId: submission.artistId, clientId: submission.clientId, kind: "ESTIMATE_APPROVED" },
        });
      }
    } else if (changed && submission.status === "RED_CONSULTATION_REQUIRED") {
      await sendConsultationRequiredEmail({
        to: submission.client.email,
        artistName: submission.artist.name,
        bookingUrl,
        log: { artistId: submission.artistId, clientId: submission.clientId, kind: "CONSULTATION_REQUIRED" },
      });
    } else if (changed && submission.status === "DECLINED") {
      await sendRequestDeclinedEmail({
        to: submission.client.email,
        artistName: submission.artist.name,
        log: { artistId: submission.artistId, clientId: submission.clientId, kind: "REQUEST_DECLINED" },
      });
    }
  } catch (err) {
    console.error(`Failed to email client about ${submission.status}:`, err);
  }

  return NextResponse.json({ submission, bookingUrl });
}

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const artistId = await getSessionArtistId();
  if (!artistId) {
    return NextResponse.json({ error: "Not logged in" }, { status: 401 });
  }

  const submission = await prisma.submission.findUnique({
    where: { id: params.id },
    include: { client: true },
  });

  if (!submission || submission.artistId !== artistId) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json({ submission });
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const artistId = await getSessionArtistId();
  if (!artistId) {
    return NextResponse.json({ error: "Not logged in" }, { status: 401 });
  }

  const existing = await prisma.submission.findUnique({
    where: { id: params.id },
    include: { appointment: true },
  });
  if (!existing || existing.artistId !== artistId) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  // A booked appointment references this submission (RESTRICT, not cascade)
  // — require canceling it first rather than silently deleting a real
  // booking (and its Google Calendar event, deposit record, etc.) as a side
  // effect of what looks like a simple "delete this submission" click. A
  // *cancelled* appointment has nothing left to lose (slot already freed,
  // Google event already removed at cancel time) — clear that leftover row
  // ourselves so it doesn't block deletion on a technicality.
  if (existing.appointment) {
    if (existing.appointment.status === "SCHEDULED") {
      return NextResponse.json(
        { error: "Cancel the appointment before deleting this submission." },
        { status: 409 }
      );
    }
    await prisma.appointment.delete({ where: { id: existing.appointment.id } });
  }

  await prisma.submission.delete({ where: { id: params.id } });
  return NextResponse.json({ ok: true });
}
