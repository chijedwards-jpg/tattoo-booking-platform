import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { getSessionArtistId } from "@/lib/auth";

// Same cap as submission inspiration photos — generous for a real photo,
// bounds how much a single upload adds to a Postgres row.
const MAX_BASE64_IMAGE_LENGTH = 8 * 1024 * 1024 * 1.4;
const MAX_IMAGES_PER_ARTIST = 24;

const CreateSchema = z.object({
  imageDataUrl: z
    .string()
    .max(MAX_BASE64_IMAGE_LENGTH, "Image is too large")
    .regex(/^data:image\/(jpeg|png|webp);base64,/, "Must be a JPEG, PNG, or WebP image"),
  caption: z.string().trim().max(200).optional(),
});

export async function POST(req: NextRequest) {
  const artistId = await getSessionArtistId();
  if (!artistId) {
    return NextResponse.json({ error: "Not logged in" }, { status: 401 });
  }

  const count = await prisma.portfolioImage.count({ where: { artistId } });
  if (count >= MAX_IMAGES_PER_ARTIST) {
    return NextResponse.json(
      { error: `You can only have up to ${MAX_IMAGES_PER_ARTIST} portfolio images. Delete one to add another.` },
      { status: 400 }
    );
  }

  const body = await req.json();
  const parsed = CreateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.errors[0]?.message ?? "Invalid image", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const image = await prisma.portfolioImage.create({
    data: { artistId, imageDataUrl: parsed.data.imageDataUrl, caption: parsed.data.caption || null },
  });

  return NextResponse.json({ image });
}
