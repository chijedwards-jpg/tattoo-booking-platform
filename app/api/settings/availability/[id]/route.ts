import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { getSessionArtistId } from "@/lib/auth";

const TimeString = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Invalid time");

const UpdateBlockSchema = z
  .object({
    startTime: TimeString,
    endTime: TimeString,
  })
  .refine((data) => data.startTime < data.endTime, {
    message: "End time must be after start time",
    path: ["endTime"],
  });

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const artistId = await getSessionArtistId();
  if (!artistId) {
    return NextResponse.json({ error: "Not logged in" }, { status: 401 });
  }

  const existing = await prisma.availabilityBlock.findUnique({ where: { id: params.id } });
  if (!existing || existing.artistId !== artistId) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const body = await req.json();
  const parsed = UpdateBlockSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid availability window", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const block = await prisma.availabilityBlock.update({
    where: { id: params.id },
    data: parsed.data,
  });

  return NextResponse.json({ block });
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const artistId = await getSessionArtistId();
  if (!artistId) {
    return NextResponse.json({ error: "Not logged in" }, { status: 401 });
  }

  const existing = await prisma.availabilityBlock.findUnique({ where: { id: params.id } });
  if (!existing || existing.artistId !== artistId) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  await prisma.availabilityBlock.delete({ where: { id: params.id } });
  return NextResponse.json({ ok: true });
}
