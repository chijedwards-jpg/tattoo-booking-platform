import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSessionArtistId } from "@/lib/auth";

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const artistId = await getSessionArtistId();
  if (!artistId) {
    return NextResponse.json({ error: "Not logged in" }, { status: 401 });
  }

  const existing = await prisma.artistRestriction.findUnique({ where: { id: params.id } });
  if (!existing || existing.artistId !== artistId) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  await prisma.artistRestriction.delete({ where: { id: params.id } });
  return NextResponse.json({ ok: true });
}
