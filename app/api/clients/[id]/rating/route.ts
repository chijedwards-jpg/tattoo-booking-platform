import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { getSessionArtistId } from "@/lib/auth";
import { artistHasClient } from "@/lib/clients";

const RatingSchema = z.object({
  rating: z.number().int().min(1).max(5),
  comment: z.string().trim().max(1000).optional(),
});

/** The artist's private rating of a client — set or replace it. */
export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const artistId = await getSessionArtistId();
  if (!artistId) return NextResponse.json({ error: "Not logged in" }, { status: 401 });
  if (!(await artistHasClient(artistId, params.id))) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const parsed = RatingSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Pick a rating from 1 to 5" }, { status: 400 });
  }

  const data = { rating: parsed.data.rating, comment: parsed.data.comment || null };
  const rating = await prisma.clientRating.upsert({
    where: { artistId_clientId: { artistId, clientId: params.id } },
    update: data,
    create: { artistId, clientId: params.id, ...data },
  });
  return NextResponse.json({ rating });
}
