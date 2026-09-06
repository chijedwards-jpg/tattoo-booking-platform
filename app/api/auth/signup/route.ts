import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { hashPassword, createSession } from "@/lib/auth";

const SignupSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8, "Password must be at least 8 characters"),
  name: z.string().min(1),
  slug: z
    .string()
    .min(3)
    .regex(/^[a-z0-9-]+$/, "Use only lowercase letters, numbers, and dashes"),
});

export async function POST(req: NextRequest) {
  const body = await req.json();
  const parsed = SignupSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.errors[0]?.message ?? "Invalid signup data" },
      { status: 400 }
    );
  }

  const { email, password, name, slug } = parsed.data;

  const existing = await prisma.artist.findFirst({
    where: { OR: [{ email }, { slug }] },
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
          { name: "Minimalist", timeMultiplier: 0.7 },
          { name: "Fine Line", timeMultiplier: 0.9 },
          { name: "Traditional", timeMultiplier: 1.0 },
          { name: "Black & Grey", timeMultiplier: 1.1 },
          { name: "Color", timeMultiplier: 1.2 },
          { name: "Realism", timeMultiplier: 1.4 },
        ],
      },
    },
  });

  await createSession(artist.id);

  return NextResponse.json({ artist: { id: artist.id, slug: artist.slug } });
}
