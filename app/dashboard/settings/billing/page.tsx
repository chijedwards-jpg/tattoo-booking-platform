import { prisma } from "@/lib/db";
import { getSessionArtistId } from "@/lib/auth";
import { redirect } from "next/navigation";
import { BillingPanel } from "./BillingPanel";

export const dynamic = "force-dynamic";

export default async function BillingSettingsPage() {
  const artistId = await getSessionArtistId();
  if (!artistId) redirect("/login");

  const artist = await prisma.artist.findUnique({
    where: { id: artistId },
    select: { stripeSubscriptionStatus: true },
  });
  if (!artist) redirect("/login");

  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="font-display text-3xl text-ink">Billing</h1>
      <p className="mt-1 text-sm text-grey">Your subscription to the platform.</p>
      <div className="mt-6">
        <BillingPanel status={artist.stripeSubscriptionStatus} />
      </div>
    </div>
  );
}
