import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSessionArtistId } from "@/lib/auth";
import { imageResponse, PRIVATE_IMAGE_CACHE } from "@/lib/imageResponse";

/** Serves the photo itself — private to the artist who added it. */
export async function GET(_req: NextRequest, { params }: { params: { id: string; photoId: string } }) {
  const artistId = await getSessionArtistId();
  if (!artistId) return NextResponse.json({ error: "Not logged in" }, { status: 401 });

  const photo = await prisma.clientPhoto.findFirst({
    where: { id: params.photoId, clientId: params.id, artistId },
    select: { imageDataUrl: true },
  });
  return imageResponse(photo?.imageDataUrl, PRIVATE_IMAGE_CACHE);
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string; photoId: string } }) {
  const artistId = await getSessionArtistId();
  if (!artistId) return NextResponse.json({ error: "Not logged in" }, { status: 401 });

  const { count } = await prisma.clientPhoto.deleteMany({
    where: { id: params.photoId, clientId: params.id, artistId },
  });
  if (count === 0) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ ok: true });
}
