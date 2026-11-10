import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { hashPassword, createSession } from "@/lib/auth";
import { checkRateLimit, getClientIp } from "@/lib/rateLimit";
import { isValidTimeZone } from "@/lib/timeZones";

// Unauthenticated account creation — without a limit, a script could spam
// accounts, squat on desirable slugs, or trigger a Stripe Checkout session
// per attempt.
const RATE_LIMIT = 5;
const RATE_WINDOW_MS = 60 * 60 * 1000;

const SignupSchema = z.object({
  email: z.string().trim().toLowerCase().email("Please enter a valid email").max(200),
  password: z.string().min(8, "Password must be at least 8 characters").max(200),
  name: z.string().trim().min(1, "Enter your name").max(100),
  slug: z
    .string()
    .trim()
    .min(3, "Your page address needs at least 3 characters")
    .max(40)
    .regex(/^[a-z0-9-]+$/, "Use only lowercase letters, numbers, and dashes"),
  timeZone: z.string().optional(),
});

export async function POST(req: NextRequest) {
  if (!checkRateLimit(`signup:${getClientIp(req)}`, RATE_LIMIT, RATE_WINDOW_MS)) {
    return NextResponse.json(
      { error: "Too many signup attempts. Please try again later." },
      { status: 429 }
    );
  }

  const body = await req.json().catch(() => null);
  const parsed = SignupSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.errors[0]?.message ?? "Invalid signup data" },
      { status: 400 }
    );
  }

  const { email, password, name, slug, timeZone } = parsed.data;

  const existing = await prisma.artist.findFirst({
    where: { OR: [{ email: { equals: email, mode: "insensitive" } }, { slug }] },
  });
  if (existing) {
    return NextResponse.json(
      { error: "An account with that email or URL already exists" },
      { status: 409 }
    );
  }

  const passwordHash = await hashPassword(password);

  // New artists get sensible pricing/rules defaults they can change later
  // once we build a settings UI — this just means the account is usable
  // immediately instead of broken until every setting is filled in.
  const artist = await prisma.artist.create({
    data: {
      email,
      passwordHash,
      name,
      slug,
      // Comes from the browser; a bad value just leaves it for the dashboard to detect.
      timeZone: timeZone && isValidTimeZone(timeZone) ? timeZone : null,
      pricingConfig: {
        create: { hourlyRate: 200, minimumPrice: 100, rangeSpreadPct: 0.15 },
      },
      bookingRules: {
        create: {
          maxAutoBookDurationMins: 180,
          maxAutoBookComplexity: 6,
          minAiConfidence: 0.75,
          referenceFreedomMaxForAutoBook: 40,
          requireConsultAboveDurationMins: 240,
        },
      },
      styles: {
        create: [
          { name: "Minimalist", multiplier: 0.7 },
          { name: "Fine Line", multiplier: 0.9 },
          { name: "Traditional", multiplier: 1.0 },
          { name: "Black & Grey", multiplier: 1.1 },
          { name: "Color", multiplier: 1.2 },
          { name: "Realism", multiplier: 1.4 },
        ],
      },
    },
  });

  await createSession(artist.id);

  return NextResponse.json({ artist: { id: artist.id, slug: artist.slug } });
}
