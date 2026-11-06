import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { getSessionArtistId } from "@/lib/auth";
import { CALIBRATION_EXAMPLES, calibrateStyles } from "@/lib/calibration";

const exampleIds = CALIBRATION_EXAMPLES.map((e) => e.id) as [string, ...string[]];

const CalibrationSchema = z.object({
  hourlyRate: z.number().positive().max(10000),
  // Blank examples are left out or null; they change nothing.
  prices: z.record(z.enum(exampleIds), z.number().positive().max(100000).nullable()),
});

export async function POST(req: NextRequest) {
  const artistId = await getSessionArtistId();
  if (!artistId) {
    return NextResponse.json({ error: "Not logged in" }, { status: 401 });
  }

  const parsed = CalibrationSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Enter an hourly rate and at least one price." }, { status: 400 });
  }

  const { hourlyRate, prices } = parsed.data;
  const calibrated = calibrateStyles(prices, hourlyRate);
  if (calibrated.length === 0) {
    return NextResponse.json({ error: "Price at least one example." }, { status: 400 });
  }

  const existing = await prisma.tattooStyle.findMany({ where: { artistId } });
  const byName = new Map(existing.map((s) => [s.name.toLowerCase(), s]));

  const changes = await prisma.$transaction(async (tx) => {
    await tx.pricingConfig.update({ where: { artistId }, data: { hourlyRate } });

    const out: { style: string; before: number | null; after: number; fromExample: string }[] = [];
    for (const c of calibrated) {
      const row = byName.get(c.style.toLowerCase());
      if (row) {
        await tx.tattooStyle.update({ where: { id: row.id }, data: { multiplier: c.multiplier } });
        out.push({ style: row.name, before: row.multiplier, after: c.multiplier, fromExample: c.fromExample });
      } else {
        // Styles the analyzer detects but the artist never set up price at
        // 1.0 today; calibrating gives them a real multiplier.
        await tx.tattooStyle.create({ data: { artistId, name: c.style, multiplier: c.multiplier } });
        out.push({ style: c.style, before: null, after: c.multiplier, fromExample: c.fromExample });
      }
    }
    return out;
  });

  return NextResponse.json({ hourlyRate, changes });
}
