import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { getSessionArtistId } from "@/lib/auth";

const UpdateSchema = z.object({
  active: z.boolean().optional(),
  relist: z.boolean().optional(), // puts a booked one of a kind back up
});

async function findOwnDesign(id: string) {
  const artistId = await getSessionArtistId();
  if (!artistId) return { error: NextResponse.json({ error: "Not logged in" }, { status: 401 }) };

  const design = await prisma.flashDesign.findUnique({
    where: { id },
    select: { id: true, artistId: true },
  });
  if (!design || design.artistId !== artistId) {
    return { error: NextResponse.json({ error: "Not found" }, { status: 404 }) };
  }
  return { design };
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const { error } = await findOwnDesign(params.id);
  if (error) return error;

  const body = await req.json().catch(() => null);
  const parsed = UpdateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  await prisma.flashDesign.update({
    where: { id: params.id },
    data: {
      ...(parsed.data.active !== undefined ? { active: parsed.data.active } : {}),
      ...(parsed.data.relist ? { claimedAt: null } : {}),
    },
  });

  return NextResponse.json({ ok: true });
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const { error } = await findOwnDesign(params.id);
  if (error) return error;

  await prisma.flashDesign.delete({ where: { id: params.id } });
  return NextResponse.json({ ok: true });
}
