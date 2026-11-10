import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { getSessionArtistId } from "@/lib/auth";
import { artistHasClient } from "@/lib/clients";

// Same caps as portfolio images.
const MAX_BASE64_IMAGE_LENGTH = 8 * 1024 * 1024 * 1.4;
const MAX_PHOTOS_PER_CLIENT = 40;

const PhotoSchema = z.object({
  imageDataUrl: z
    .string()
    .max(MAX_BASE64_IMAGE_LENGTH, "Image is too large")
    .regex(/^data:image\/(jpeg|png|webp);base64,/, "Must be a JPEG, PNG, or WebP image"),
  caption: z.string().trim().max(200).optional(),
});

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const artistId = await getSessionArtistId();
  if (!artistId) return NextResponse.json({ error: "Not logged in" }, { status: 401 });
  if (!(await artistHasClient(artistId, params.id))) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const count = await prisma.clientPhoto.count({ where: { artistId, clientId: params.id } });
  if (count >= MAX_PHOTOS_PER_CLIENT) {
    return NextResponse.json(
      { error: `You can add up to ${MAX_PHOTOS_PER_CLIENT} photos per client. Delete one to add another.` },
      { status: 400 }
    );
  }

  const parsed = PhotoSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.errors[0]?.message ?? "Invalid image" }, { status: 400 });
  }

  const photo = await prisma.clientPhoto.create({
    data: {
      artistId,
      clientId: params.id,
      imageDataUrl: parsed.data.imageDataUrl,
      caption: parsed.data.caption || null,
    },
    select: { id: true },
  });
  return NextResponse.json({ photo });
}
