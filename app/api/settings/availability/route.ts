import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { getSessionArtistId } from "@/lib/auth";

const TimeString = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Invalid time");

const CreateBlockSchema = z
  .object({
    type: z.enum(["TATTOO", "CONSULTATION"]),
    dayOfWeek: z.number().int().min(0).max(6),
    startTime: TimeString,
    endTime: TimeString,
  })
  .refine((data) => data.startTime < data.endTime, {
    message: "End time must be after start time",
    path: ["endTime"],
  });

export async function POST(req: NextRequest) {
  const artistId = await getSessionArtistId();
  if (!artistId) {
    return NextResponse.json({ error: "Not logged in" }, { status: 401 });
  }

  const body = await req.json();
  const parsed = CreateBlockSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid availability window", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const block = await prisma.availabilityBlock.create({
    data: { artistId, ...parsed.data },
  });

  return NextResponse.json({ block });
}
