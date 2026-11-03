import { prisma } from "@/lib/db";
import { getSessionArtistId } from "@/lib/auth";
import { redirect } from "next/navigation";
import { FlashManager } from "./FlashManager";

export const dynamic = "force-dynamic";

export default async function FlashPage() {
  const artistId = await getSessionArtistId();
  if (!artistId) redirect("/login");

  const artist = await prisma.artist.findUnique({
    where: { id: artistId },
    select: { slug: true },
  });
  if (!artist) redirect("/login");

  const designs = await prisma.flashDesign.findMany({
    where: { artistId },
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
  });

  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="font-display text-3xl text-ink">Flash</h1>
      <p className="mt-1 text-sm text-grey">
        Add ready-to-go designs with a set price and time. Clients pick one and book it right away
        during your tattoo hours, with no review needed.
      </p>
      <a
        href={`/a/${artist.slug}/flash`}
        target="_blank"
        rel="noopener noreferrer"
        className="mt-2 inline-block text-sm text-ink-red hover:underline"
      >
        View your flash page \u2197
      </a>
      <div className="mt-6">
        <FlashManager
          designs={designs.map((d) => ({ ...d, claimedAt: d.claimedAt?.toISOString() ?? null }))}
        />
      </div>
    </div>
  );
}
