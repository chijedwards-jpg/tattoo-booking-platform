import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { getSessionArtistId } from "@/lib/auth";

const CreateStyleSchema = z.object({
  name: z.string().trim().min(1),
  timeMultiplier: z.number().positive(),
});

export async function POST(req: NextRequest) {
  const artistId = await getSessionArtistId();
  if (!artistId) {
    return NextResponse.json({ error: "Not logged in" }, { status: 401 });
  }

  const body = await req.json();
  const parsed = CreateStyleSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid style", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  try {
    const style = await prisma.tattooStyle.create({
      data: { artistId, name: parsed.data.name, timeMultiplier: parsed.data.timeMultiplier },
    });
    return NextResponse.json({ style });
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
      return NextResponse.json({ error: "A style with that name already exists" }, { status: 409 });
    }
    throw err;
  }
}
