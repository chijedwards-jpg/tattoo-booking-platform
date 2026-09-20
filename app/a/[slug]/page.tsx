import { prisma } from "@/lib/db";
import { notFound } from "next/navigation";
import IntakeFlow from "./IntakeFlow";

export const dynamic = "force-dynamic";

export default async function ArtistIntakePage({
  params,
}: {
  params: { slug: string };
}) {
  const artist = await prisma.artist.findUnique({
    where: { slug: params.slug },
    include: { pricingConfig: true, bookingRules: true },
  });

  // Not fully configured (no pricing/booking rules) means submissions would
  // fail anyway — same as /api/submissions' own check — so treat it as not
  // found rather than showing a form that can't actually be submitted.
  if (!artist || !artist.pricingConfig || !artist.bookingRules) {
    notFound();
  }

  return <IntakeFlow artistSlug={artist.slug} artistName={artist.name} />;
}
