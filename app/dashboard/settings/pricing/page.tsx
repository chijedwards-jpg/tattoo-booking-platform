import { prisma } from "@/lib/db";
import { getSessionArtistId } from "@/lib/auth";
import { redirect } from "next/navigation";
import { PricingForm } from "../SettingsForm";

export const dynamic = "force-dynamic";

export default async function PricingSettingsPage() {
  const artistId = await getSessionArtistId();
  if (!artistId) redirect("/login");

  const pricingConfig = await prisma.pricingConfig.findUnique({ where: { artistId } });
  if (!pricingConfig) redirect("/login");

  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="font-display text-3xl text-ink">Pricing</h1>
      <p className="mt-1 text-sm text-grey">
        This drives every estimate your clients see, and what they pay to hold a slot.
      </p>
      <div className="mt-6">
        <PricingForm pricingConfig={pricingConfig} />
      </div>
    </div>
  );
}
