import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { prisma } from "@/lib/db";
import { isFlashBookable } from "@/lib/flash";
import { FlashBooking } from "./FlashBooking";

export const dynamic = "force-dynamic";

async function loadDesign(id: string, slug: string) {
  const design = await prisma.flashDesign.findUnique({
    where: { id },
    select: {
      id: true,
      name: true,
      price: true,
      durationMins: true,
      oneOff: true,
      active: true,
      claimedAt: true,
      artist: { select: { slug: true, name: true } },
    },
  });
  return design && design.artist.slug === slug ? design : null;
}

export async function generateMetadata({
  params,
}: {
  params: { slug: string; id: string };
}): Promise<Metadata> {
  const design = await loadDesign(params.id, params.slug);
  return design ? { title: `${design.name} by ${design.artist.name}` } : {};
}

export default async function FlashDesignPage({ params }: { params: { slug: string; id: string } }) {
  const design = await loadDesign(params.id, params.slug);
  if (!design) notFound();

  return (
    <FlashBooking
      artistSlug={params.slug}
      artistName={design.artist.name}
      design={{
        id: design.id,
        name: design.name,
        price: design.price,
        durationMins: design.durationMins,
        oneOff: design.oneOff,
      }}
      available={isFlashBookable(design)}
    />
  );
}
