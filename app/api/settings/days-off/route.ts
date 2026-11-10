import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { getSessionArtistId } from "@/lib/auth";

const DateString = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Pick a date");
const MAX_DAYS = 90;

const Schema = z
  .object({ from: DateString, to: DateString.optional() })
  .refine((d) => !d.to || d.to >= d.from, { message: "The last day can't be before the first day" });

/**
 * Adds one or more days off (a vacation, a convention). Stored as blocked
 * AvailabilityBlock rows, one per day, at UTC midnight of the calendar day —
 * see blockedDatesFrom in lib/slots.ts. Removing one uses the existing
 * DELETE /api/settings/availability/[id].
 */
export async function POST(req: NextRequest) {
  const artistId = await getSessionArtistId();
  if (!artistId) return NextResponse.json({ error: "Not logged in" }, { status: 401 });

  const parsed = Schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.errors[0]?.message ?? "Invalid dates" }, { status: 400 });
  }

  const start = new Date(`${parsed.data.from}T00:00:00Z`);
  const end = new Date(`${parsed.data.to ?? parsed.data.from}T00:00:00Z`);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
    return NextResponse.json({ error: "Pick a valid date" }, { status: 400 });
  }
  const days = Math.round((end.getTime() - start.getTime()) / 86_400_000) + 1;
  if (days > MAX_DAYS) {
    return NextResponse.json({ error: `Add at most ${MAX_DAYS} days at a time` }, { status: 400 });
  }

  const existing = await prisma.availabilityBlock.findMany({
    where: { artistId, isBlocked: true, date: { gte: start, lte: end } },
    select: { date: true },
  });
  const already = new Set(existing.map((e) => e.date!.toISOString().slice(0, 10)));

  const toCreate = [];
  for (let i = 0; i < days; i++) {
    const day = new Date(start.getTime() + i * 86_400_000);
    if (already.has(day.toISOString().slice(0, 10))) continue;
    toCreate.push({
      artistId,
      type: "TATTOO" as const, // a day off blocks every kind of booking; see findOpenSlots
      date: day,
      isBlocked: true,
      startTime: "00:00",
      endTime: "23:59",
    });
  }
  if (toCreate.length) await prisma.availabilityBlock.createMany({ data: toCreate });

  const daysOff = await prisma.availabilityBlock.findMany({
    where: { artistId, isBlocked: true, date: { not: null } },
    orderBy: { date: "asc" },
    select: { id: true, date: true },
  });
  return NextResponse.json({ daysOff: daysOff.map((d) => ({ id: d.id, date: d.date!.toISOString().slice(0, 10) })) });
}
