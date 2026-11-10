import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { isFlashBookable } from "@/lib/flash";
import { findOpenSlots } from "@/lib/slots";
import { calculateDeposit } from "@/lib/pricingEngine";
import { createGoogleCalendarEvent } from "@/lib/googleOAuth";
import { sendBookingConfirmationEmail } from "@/lib/email";
import { checkRateLimit, getClientIp } from "@/lib/rateLimit";
import { newClientToken, clientLink } from "@/lib/reminders";
import { bookWithArtistLock, SlotTakenError } from "@/lib/bookingLock";

const BookingSchema = z.object({
  clientEmail: z.string().trim().email("Please enter a valid email").max(200),
  clientName: z.string().trim().max(100).optional().transform((s) => s || undefined),
  clientPhone: z.string().trim().max(30).optional().transform((s) => s || undefined),
  placement: z.string().min(1).max(40),
  startTime: z.string(),
});

// No auth here, and every booking takes a real slot off the artist's calendar.
const RATE_LIMIT = 8;
const RATE_WINDOW_MS = 60 * 60 * 1000;

class AlreadyClaimedError extends Error {}

/**
 * Books a flash design straight onto the calendar. There's no estimate or
 * review since the artist set the price and time up front. It's saved as a
 * BOOKED submission so it appears in the dashboard with deposit tracking like
 * every other booking.
 */
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  if (!checkRateLimit(`flash-book:${getClientIp(req)}`, RATE_LIMIT, RATE_WINDOW_MS)) {
    return NextResponse.json(
      { error: "Too many requests. Please try again later." },
      { status: 429 }
    );
  }

  const body = await req.json();
  const parsed = BookingSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Please check your details and try again." }, { status: 400 });
  }
  const input = parsed.data;

  const design = await prisma.flashDesign.findUnique({
    where: { id: params.id },
    include: { artist: { include: { availability: true, pricingConfig: true } } },
  });
  if (!design || !design.artist.pricingConfig || !isFlashBookable(design)) {
    return NextResponse.json({ error: "This design is no longer available." }, { status: 409 });
  }
  const { artist } = design;
  const pricingConfig = artist.pricingConfig!;

  // Only a time the artist is really offering can be booked, which also
  // covers someone having taken it since the client loaded the page.
  const startTime = new Date(input.startTime);
  const { slots, timeZone } = await findOpenSlots({
    artistId: artist.id,
    timeZone: artist.timeZone,
    availability: artist.availability,
    type: "TATTOO",
    durationMins: design.durationMins,
  });
  const slot = slots.find((s) => s.start.getTime() === startTime.getTime());
  if (!slot) {
    return NextResponse.json(
      { error: "That time is no longer available. Please pick another." },
      { status: 409 }
    );
  }

  const depositAmount = calculateDeposit(pricingConfig, design.price);

  let appointment;
  try {
    // One booking per artist at a time, so two clients can't land on the
    // same slot — see bookWithArtistLock.
    appointment = await bookWithArtistLock(artist.id, slot, async (tx) => {
      if (design.oneOff) {
        // Conditional, so two clients can't both take a one of a kind.
        const claimed = await tx.flashDesign.updateMany({
          where: { id: design.id, active: true, claimedAt: null },
          data: { claimedAt: new Date() },
        });
        if (claimed.count === 0) throw new AlreadyClaimedError();
      }

      const client = await tx.client.upsert({
        where: { email: input.clientEmail },
        update: { name: input.clientName, phone: input.clientPhone },
        create: { email: input.clientEmail, name: input.clientName, phone: input.clientPhone },
      });

      const submission = await tx.submission.create({
        data: {
          artistId: artist.id,
          clientId: client.id,
          flashDesignId: design.id,
          inspirationImages: [design.imageDataUrl],
          description: `Flash design: ${design.name}`,
          placement: input.placement,
          referenceFreedom: 0,
          estimatedPriceLow: design.price,
          estimatedPriceHigh: design.price,
          estimatedHours: design.durationMins / 60,
          status: "BOOKED",
        },
      });

      const created = await tx.appointment.create({
        data: {
          artistId: artist.id,
          clientId: client.id,
          submissionId: submission.id,
          type: "TATTOO",
          startTime: slot.start,
          endTime: slot.end,
          depositAmount,
          clientToken: newClientToken(),
        },
      });

      return created;
    });
  } catch (err) {
    if (err instanceof AlreadyClaimedError) {
      return NextResponse.json({ error: "Someone just booked this design." }, { status: 409 });
    }
    if (err instanceof SlotTakenError) {
      return NextResponse.json({ error: "That time was just booked by someone else. Please pick another." }, { status: 409 });
    }
    throw err;
  }

  // Both fail open: the booking already succeeded, same as /api/appointments.
  try {
    const googleEventId = await createGoogleCalendarEvent(artist.id, {
      summary: `Flash: ${design.name} \u2014 ${input.clientEmail}`,
      description: `Placement: ${input.placement}`,
      start: slot.start,
      end: slot.end,
    });
    if (googleEventId) {
      await prisma.appointment.update({ where: { id: appointment.id }, data: { googleEventId } });
    }
  } catch (err) {
    console.error("Failed to push flash appointment to Google Calendar:", err);
  }

  try {
    await sendBookingConfirmationEmail({
      to: input.clientEmail,
      artistName: artist.name,
      type: "TATTOO",
      startTime: slot.start,
      endTime: slot.end,
      timeZone,
      depositAmount,
      depositInstructions: pricingConfig.depositInstructions,
      confirmUrl: clientLink(appointment.clientToken!),
      log: {
        artistId: artist.id,
        clientId: appointment.clientId,
        appointmentId: appointment.id,
        kind: "BOOKING_CONFIRMATION",
      },
    });
  } catch (err) {
    console.error("Failed to send flash booking confirmation email:", err);
  }

  return NextResponse.json({
    slot: { start: slot.start.toISOString(), end: slot.end.toISOString(), timeZone },
    deposit: { amount: depositAmount, instructions: pricingConfig.depositInstructions },
  });
}
