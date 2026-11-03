import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { getSessionArtistId } from "@/lib/auth";
import { isValidTimeZone } from "@/lib/timeZones";

const UpdateSchema = z.object({
  timeZone: z.string().refine(isValidTimeZone, "Unknown time zone"),
});

export async function PATCH(req: NextRequest) {
  const artistId = await getSessionArtistId();
  if (!artistId) {
    return NextResponse.json({ error: "Not logged in" }, { status: 401 });
  }

  const body = await req.json();
  const parsed = UpdateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const artist = await prisma.artist.update({
    where: { id: artistId },
    data: { timeZone: parsed.data.timeZone },
    select: { timeZone: true },
  });

  return NextResponse.json({ timeZone: artist.timeZone });
}
