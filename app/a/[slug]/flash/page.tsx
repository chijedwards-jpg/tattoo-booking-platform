import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { ChevronLeft } from "lucide-react";
import { prisma } from "@/lib/db";
import { formatFlashDuration, isFlashBookable } from "@/lib/flash";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: { slug: string } }): Promise<Metadata> {
  const artist = await prisma.artist.findUnique({
    where: { slug: params.slug },
    select: { name: true },
  });
  if (!artist) return {};
  return {
    title: `Flash by ${artist.name}`,
    description: `Pick a flash design from ${artist.name} and book it right away.`,
  };
}

export default async function FlashGalleryPage({ params }: { params: { slug: string } }) {
  const artist = await prisma.artist.findUnique({
    where: { slug: params.slug },
    select: {
      name: true,
      flashDesigns: {
        where: { active: true },
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          name: true,
          price: true,
          durationMins: true,
          oneOff: true,
          active: true,
          claimedAt: true,
        },
      },
    },
  });
  if (!artist) notFound();

  const designs = artist.flashDesigns.filter(isFlashBookable);

  return (
    <main className="min-h-screen bg-paper text-ink">
      <div className="mx-auto max-w-3xl px-5 py-8">
        <Link href={`/a/${params.slug}`} className="flex items-center gap-1 text-sm text-grey hover:text-ink">
          <ChevronLeft size={15} /> {artist.name}
        </Link>
        <h1 className="mt-4 font-display text-3xl leading-tight text-ink">Flash</h1>
        <p className="mt-1 text-sm text-grey">Pick a design and book it right away.</p>

        {designs.length === 0 ? (
          <div className="mt-6 rounded-2xl border border-dashed border-line bg-card p-8 text-center text-sm text-grey">
            No flash available right now. Check back soon.
          </div>
        ) : (
          <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3">
            {designs.map((d) => (
              <Link
                key={d.id}
                href={`/a/${params.slug}/flash/${d.id}`}
                className="overflow-hidden rounded-xl border border-line bg-card transition-colors hover:border-ink-red/50"
              >
                <img
                  src={`/api/public/flash/${d.id}/image`}
                  alt={d.name}
                  loading="lazy"
                  className="aspect-square w-full object-cover"
                />
                <div className="p-3">
                  <p className="truncate text-sm font-medium text-ink">{d.name}</p>
                  <p className="mt-0.5 text-xs text-grey">
                    ${d.price.toFixed(0)} \u00b7 {formatFlashDuration(d.durationMins)}
                  </p>
                  {d.oneOff && <p className="mt-0.5 text-xs text-ink-red">One of a kind</p>}
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
