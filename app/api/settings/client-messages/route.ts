import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { getSessionArtistId } from "@/lib/auth";
import { REMINDER_DAY_OPTIONS } from "@/lib/reminders";

const Schema = z.object({
  reminderDaysBefore: z
    .array(z.number().int().refine((d) => (REMINDER_DAY_OPTIONS as readonly number[]).includes(d)))
    .max(REMINDER_DAY_OPTIONS.length),
  sendReviewRequests: z.boolean(),
});

export async function PATCH(req: NextRequest) {
  const artistId = await getSessionArtistId();
  if (!artistId) return NextResponse.json({ error: "Not logged in" }, { status: 401 });

  const parsed = Schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid settings" }, { status: 400 });

  const bookingRules = await prisma.bookingRules.update({
    where: { artistId },
    data: {
      reminderDaysBefore: Array.from(new Set(parsed.data.reminderDaysBefore)).sort((a, b) => b - a),
      sendReviewRequests: parsed.data.sendReviewRequests,
    },
  });
  return NextResponse.json({ bookingRules });
}
