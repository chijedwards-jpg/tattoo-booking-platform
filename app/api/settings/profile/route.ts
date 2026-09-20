import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { getSessionArtistId } from "@/lib/auth";

const ProfileSchema = z.object({
  name: z.string().trim().min(1),
  bio: z.string().nullable(),
  location: z.string().nullable(),
});

export async function PATCH(req: NextRequest) {
  const artistId = await getSessionArtistId();
  if (!artistId) {
    return NextResponse.json({ error: "Not logged in" }, { status: 401 });
  }

  const body = await req.json();
  const parsed = ProfileSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid profile", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const artist = await prisma.artist.update({
    where: { id: artistId },
    data: parsed.data,
  });

  return NextResponse.json({ artist });
}
