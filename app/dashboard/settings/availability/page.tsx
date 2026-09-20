import { prisma } from "@/lib/db";
import { getSessionArtistId } from "@/lib/auth";
import { redirect } from "next/navigation";
import { AvailabilityForm } from "../AvailabilityForm";

export const dynamic = "force-dynamic";

export default async function AvailabilitySettingsPage() {
  const artistId = await getSessionArtistId();
  if (!artistId) redirect("/login");

  const blocks = await prisma.availabilityBlock.findMany({
    where: { artistId, dayOfWeek: { not: null } },
  });

  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="font-display text-3xl text-ink">Availability</h1>
      <p className="mt-1 text-sm text-grey">
        Weekly recurring hours clients can book into. One-off blocked days
        (vacation, etc.) aren't supported yet.
      </p>
      <div className="mt-6">
        <AvailabilityForm blocks={blocks} />
      </div>
    </div>
  );
}
