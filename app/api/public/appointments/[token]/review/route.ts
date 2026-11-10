import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { checkRateLimit, getClientIp } from "@/lib/rateLimit";

const ReviewSchema = z.object({
  rating: z.number().int().min(1).max(5),
  comment: z.string().trim().max(1000).optional(),
});

/** Client leaves a review through the link in their review-request email. */
export async function POST(req: NextRequest, { params }: { params: { token: string } }) {
  if (!checkRateLimit(`client-review:${getClientIp(req)}`, 10, 60 * 60 * 1000)) {
    return NextResponse.json({ error: "Too many tries. Please wait a bit." }, { status: 429 });
  }

  const parsed = ReviewSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Please pick a star rating." }, { status: 400 });
  }

  const appt = await prisma.appointment.findUnique({
    where: { clientToken: params.token },
    include: { review: true },
  });
  if (!appt) {
    return NextResponse.json({ error: "Appointment not found" }, { status: 404 });
  }
  if (appt.type !== "TATTOO" || appt.endTime > new Date() || ["CANCELLED", "NO_SHOW"].includes(appt.status)) {
    return NextResponse.json({ error: "This appointment can't be reviewed." }, { status: 400 });
  }
  if (appt.review) {
    return NextResponse.json({ error: "You've already reviewed this appointment." }, { status: 409 });
  }

  await prisma.review.create({
    data: {
      artistId: appt.artistId,
      clientId: appt.clientId,
      appointmentId: appt.id,
      rating: parsed.data.rating,
      comment: parsed.data.comment || null,
    },
  });

  return NextResponse.json({ ok: true });
}
