import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { getSessionArtistId } from "@/lib/auth";

const CreateRestrictionSchema = z.object({
  type: z.enum(["PLACEMENT", "STYLE", "SUBJECT_MATTER", "OTHER"]),
  value: z.string().trim().min(1),
});

export async function POST(req: NextRequest) {
  const artistId = await getSessionArtistId();
  if (!artistId) {
    return NextResponse.json({ error: "Not logged in" }, { status: 401 });
  }

  const body = await req.json();
  const parsed = CreateRestrictionSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid restriction", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const restriction = await prisma.artistRestriction.create({
    data: { artistId, type: parsed.data.type, value: parsed.data.value },
  });

  return NextResponse.json({ restriction });
}
