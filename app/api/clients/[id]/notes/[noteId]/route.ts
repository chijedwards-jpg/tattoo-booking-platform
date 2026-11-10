import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSessionArtistId } from "@/lib/auth";

export async function DELETE(_req: NextRequest, { params }: { params: { id: string; noteId: string } }) {
  const artistId = await getSessionArtistId();
  if (!artistId) return NextResponse.json({ error: "Not logged in" }, { status: 401 });

  const { count } = await prisma.clientNote.deleteMany({
    where: { id: params.noteId, clientId: params.id, artistId },
  });
  if (count === 0) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ ok: true });
}
