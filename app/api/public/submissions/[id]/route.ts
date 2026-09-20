import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { BOOKABLE_STATUSES } from "@/lib/bookingStatus";
import { calculateDeposit } from "@/lib/pricingEngine";

/**
 * Unauthenticated lookup used by the /book/[id] page — clients don't have
 * accounts, so the submission's cuid is the only credential they carry (via
 * the emailed booking link). Only return fields safe to expose that way:
 * no client contact info, no other clients' data.
 */
export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const submission = await prisma.submission.findUnique({
    where: { id: params.id },
    select: {
      id: true,
      status: true,
      placement: true,
      aiDetectedStyle: true,
      estimatedHours: true,
      estimatedPriceLow: true,
      estimatedPriceHigh: true,
      artistOverridePriceLow: true,
      artistOverridePriceHigh: true,
      artist: { select: { pricingConfig: true } },
      appointment: {
        select: { startTime: true, type: true, depositPaid: true, depositAmount: true },
      },
    },
  });

  if (!submission) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const priceLow = submission.artistOverridePriceLow ?? submission.estimatedPriceLow;

  return NextResponse.json({
    id: submission.id,
    status: submission.status,
    placement: submission.placement,
    detectedStyle: submission.aiDetectedStyle,
    hours: submission.estimatedHours,
    priceLow,
    priceHigh: submission.artistOverridePriceHigh ?? submission.estimatedPriceHigh,
    bookable: BOOKABLE_STATUSES.includes(submission.status),
    deposit:
      priceLow != null && submission.artist.pricingConfig
        ? {
            amount: calculateDeposit(submission.artist.pricingConfig, priceLow),
            instructions: submission.artist.pricingConfig.depositInstructions,
          }
        : null,
    appointment: submission.appointment
      ? {
          startTime: submission.appointment.startTime.toISOString(),
          type: submission.appointment.type,
          depositPaid: submission.appointment.depositPaid,
          depositAmount: submission.appointment.depositAmount,
        }
      : null,
  });
}
