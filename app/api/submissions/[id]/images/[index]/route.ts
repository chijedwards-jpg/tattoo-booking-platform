import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSessionArtistId } from "@/lib/auth";
import { imageResponse, PRIVATE_IMAGE_CACHE } from "@/lib/imageResponse";

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string; index: string } }
) {
  const artistId = await getSessionArtistId();
  if (!artistId) {
    return NextResponse.json({ error: "Not logged in" }, { status: 401 });
  }

  const submission = await prisma.submission.findUnique({
    where: { id: params.id },
    select: { artistId: true, inspirationImages: true },
  });
  if (!submission || submission.artistId !== artistId) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return imageResponse(submission.inspirationImages[Number(params.index)], PRIVATE_IMAGE_CACHE);
}
