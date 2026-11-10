import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { getSessionArtistId } from "@/lib/auth";

// The browser shrinks these to ~1MB before upload; this just bounds the row.
const MAX_BASE64_IMAGE_LENGTH = 1.5 * 1024 * 1024;
const MAX_DESIGNS_PER_ARTIST = 100;

const CreateSchema = z.object({
  name: z.string().trim().min(1, "Give the design a name").max(80),
  imageDataUrl: z
    .string()
    .max(MAX_BASE64_IMAGE_LENGTH, "Image is too large")
    .regex(/^data:image\/(jpeg|png|webp);base64,/, "Must be a JPEG, PNG, or WebP image"),
  price: z.number().positive("Enter a price").max(100000),
  durationMins: z.number().int().min(15, "Enter how long it takes").max(1440),
  oneOff: z.boolean(),
});

export async function POST(req: NextRequest) {
  const artistId = await getSessionArtistId();
  if (!artistId) {
    return NextResponse.json({ error: "Not logged in" }, { status: 401 });
  }

  const count = await prisma.flashDesign.count({ where: { artistId } });
  if (count >= MAX_DESIGNS_PER_ARTIST) {
    return NextResponse.json(
      { error: `You can only have up to ${MAX_DESIGNS_PER_ARTIST} flash designs. Delete one to add another.` },
      { status: 400 }
    );
  }

  const body = await req.json().catch(() => null);
  const parsed = CreateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.errors[0]?.message ?? "Invalid design" },
      { status: 400 }
    );
  }

  const design = await prisma.flashDesign.create({
    data: { artistId, ...parsed.data },
    select: { id: true },
  });

  return NextResponse.json({ design });
}
