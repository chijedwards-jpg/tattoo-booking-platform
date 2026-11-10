import { prisma } from "@/lib/db";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import IntakeFlow from "./IntakeFlow";
import { isFlashBookable } from "@/lib/flash";

export const dynamic = "force-dynamic";

// Each artist's page needs its own tab title/share preview — the root
// layout's metadata now describes the platform itself (see app/page.tsx),
// not any individual artist's booking page.
export async function generateMetadata({ params }: { params: { slug: string } }): Promise<Metadata> {
  const artist = await prisma.artist.findUnique({
    where: { slug: params.slug },
    select: { name: true },
  });
  if (!artist) return {};
  return {
    title: `Book with ${artist.name}`,
    description: `Start your tattoo request with ${artist.name}.`,
  };
}

export default async function ArtistIntakePage({
  params,
}: {
  params: { slug: string };
}) {
  const artist = await prisma.artist.findUnique({
    where: { slug: params.slug },
    include: {
      pricingConfig: true,
      bookingRules: true,
      portfolioImages: { orderBy: { createdAt: "desc" }, select: { id: true } },
      flashDesigns: {
        where: { active: true },
        select: { oneOff: true, claimedAt: true, active: true },
      },
      reviews: {
        where: { showOnPage: true },
        orderBy: { createdAt: "desc" },
        take: 10,
        select: { id: true, rating: true, comment: true, client: { select: { name: true } } },
      },
    },
  });

  // Not fully configured (no pricing/booking rules) means submissions would
  // fail anyway — same as /api/submissions' own check — so treat it as not
  // found rather than showing a form that can't actually be submitted.
  if (!artist || !artist.pricingConfig || !artist.bookingRules) {
    notFound();
  }

  return (
    <IntakeFlow
      artistSlug={artist.slug}
      artistName={artist.name}
      artistBio={artist.bio}
      portfolioImages={artist.portfolioImages.map((i) => `/api/public/portfolio/${i.id}/image`)}
      hasFlash={artist.flashDesigns.some(isFlashBookable)}
      reviews={artist.reviews.map((r) => ({
        id: r.id,
        rating: r.rating,
        comment: r.comment,
        // First name only — a public page shouldn't carry a client's full name.
        name: r.client.name?.trim().split(/\s+/)[0] || null,
      }))}
    />
  );
}
