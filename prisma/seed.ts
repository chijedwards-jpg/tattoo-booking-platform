import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

const DEMO_PASSWORD = "demo1234"; // for testing the login page against this seeded account

async function main() {
  const passwordHash = await bcrypt.hash(DEMO_PASSWORD, 10);

  const artist = await prisma.artist.upsert({
    where: { slug: "demo-artist" },
    update: { passwordHash },
    create: {
      email: "demo@example.com",
      passwordHash,
      name: "Demo Artist",
      slug: "demo-artist",
      bio: "This is a placeholder artist profile used for testing the intake flow.",
      location: "Salt Lake City, UT",
      pricingConfig: {
        create: {
          hourlyRate: 250,
          minimumPrice: 150,
          rangeSpreadPct: 0.15,
          depositFlat: 150,
          depositInstructions: "Venmo @demo-artist-tattoo",
        },
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

  console.log("Seeded demo artist:", artist.slug, artist.id);

  // Availability is seeded separately (not inside the upsert) so re-running
  // this script updates it even for an artist that already existed.
  await prisma.availabilityBlock.deleteMany({ where: { artistId: artist.id } });
  await prisma.availabilityBlock.createMany({
    data: [
      { artistId: artist.id, type: "TATTOO", dayOfWeek: 1, startTime: "10:00", endTime: "18:00" },
      { artistId: artist.id, type: "TATTOO", dayOfWeek: 2, startTime: "10:00", endTime: "18:00" },
      { artistId: artist.id, type: "TATTOO", dayOfWeek: 3, startTime: "10:00", endTime: "18:00" },
      { artistId: artist.id, type: "TATTOO", dayOfWeek: 4, startTime: "10:00", endTime: "18:00" },
      { artistId: artist.id, type: "CONSULTATION", dayOfWeek: 2, startTime: "18:00", endTime: "20:00" },
      { artistId: artist.id, type: "CONSULTATION", dayOfWeek: 4, startTime: "18:00", endTime: "20:00" },
    ],
  });
  console.log("Seeded availability blocks");
  console.log(`\nDemo login: demo@example.com / ${DEMO_PASSWORD}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
