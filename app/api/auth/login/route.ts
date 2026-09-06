import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { verifyPassword, createSession } from "@/lib/auth";

const LoginSchema = z.object({
  email: z.string().email(),
  password: z.string(),
});

export async function POST(req: NextRequest) {
  const body = await req.json();
  const parsed = LoginSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid login" }, { status: 400 });
  }

  const artist = await prisma.artist.findUnique({
    where: { email: parsed.data.email },
  });

  // Deliberately vague error message — don't reveal whether the email
  // exists, which would help an attacker enumerate accounts.
  if (!artist) {
    return NextResponse.json({ error: "Incorrect email or password" }, { status: 401 });
  }

  const valid = await verifyPassword(parsed.data.password, artist.passwordHash);
  if (!valid) {
    return NextResponse.json({ error: "Incorrect email or password" }, { status: 401 });
  }

  await createSession(artist.id);

  return NextResponse.json({ artist: { id: artist.id, slug: artist.slug } });
}
