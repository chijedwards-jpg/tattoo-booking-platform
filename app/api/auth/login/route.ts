import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { verifyPassword, createSession } from "@/lib/auth";
import { checkRateLimit, getClientIp } from "@/lib/rateLimit";

const LoginSchema = z.object({
  email: z.string().email(),
  password: z.string(),
});

// Bcrypt already slows each guess, but without a limit a script could still
// sustain credential-stuffing or brute-force attempts against a known email.
const RATE_LIMIT = 10;
const RATE_WINDOW_MS = 5 * 60 * 1000;

export async function POST(req: NextRequest) {
  if (!checkRateLimit(`login:${getClientIp(req)}`, RATE_LIMIT, RATE_WINDOW_MS)) {
    return NextResponse.json(
      { error: "Too many attempts. Please try again later." },
      { status: 429 }
    );
  }

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
