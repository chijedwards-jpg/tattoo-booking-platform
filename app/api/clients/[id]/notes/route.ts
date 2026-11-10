import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { getSessionArtistId } from "@/lib/auth";
import { artistHasClient } from "@/lib/clients";

const NoteSchema = z.object({ body: z.string().trim().min(1, "Write a note first").max(5000) });

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const artistId = await getSessionArtistId();
  if (!artistId) return NextResponse.json({ error: "Not logged in" }, { status: 401 });
  if (!(await artistHasClient(artistId, params.id))) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const parsed = NoteSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.errors[0]?.message ?? "Invalid note" }, { status: 400 });
  }

  const note = await prisma.clientNote.create({
    data: { artistId, clientId: params.id, body: parsed.data.body },
  });
  return NextResponse.json({ note });
}
