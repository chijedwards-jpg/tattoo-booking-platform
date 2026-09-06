import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { getSessionArtistId } from "@/lib/auth";

const UpdateStyleSchema = z.object({
  name: z.string().trim().min(1).optional(),
  timeMultiplier: z.number().positive().optional(),
  active: z.boolean().optional(),
});

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const artistId = await getSessionArtistId();
  if (!artistId) {
    return NextResponse.json({ error: "Not logged in" }, { status: 401 });
  }

  const existing = await prisma.tattooStyle.findUnique({ where: { id: params.id } });
  if (!existing || existing.artistId !== artistId) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const body = await req.json();
  const parsed = UpdateStyleSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid style", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  try {
    const style = await prisma.tattooStyle.update({
      where: { id: params.id },
      data: parsed.data,
    });
    return NextResponse.json({ style });
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
      return NextResponse.json({ error: "A style with that name already exists" }, { status: 409 });
    }
    throw err;
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const artistId = await getSessionArtistId();
  if (!artistId) {
    return NextResponse.json({ error: "Not logged in" }, { status: 401 });
  }

  const existing = await prisma.tattooStyle.findUnique({ where: { id: params.id } });
  if (!existing || existing.artistId !== artistId) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  await prisma.tattooStyle.delete({ where: { id: params.id } });
  return NextResponse.json({ ok: true });
}
