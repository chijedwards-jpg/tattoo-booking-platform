import { prisma } from "@/lib/db";
import { getSessionArtistId } from "@/lib/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { StylesForm } from "../StylesAndRestrictions";
import { StyleMultiplierModeToggle } from "../StyleMultiplierModeToggle";

export const dynamic = "force-dynamic";

export default async function StylesSettingsPage() {
  const artistId = await getSessionArtistId();
  if (!artistId) redirect("/login");

  const [styles, pricingConfig] = await Promise.all([
    prisma.tattooStyle.findMany({ where: { artistId }, orderBy: { name: "asc" } }),
    prisma.pricingConfig.findUnique({ where: { artistId }, select: { styleMultiplierMode: true } }),
  ]);
  if (!pricingConfig) redirect("/login");

  const mode = pricingConfig.styleMultiplierMode;

  return (
    <div className="mx-auto max-w-2xl">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl text-ink">Styles & time</h1>
          <p className="mt-1 text-sm text-grey">
            {mode === "TIME"
              ? "Multipliers scale the system's base hour estimate — a \"busier\" style both costs more and books a longer slot."
              : "Multipliers scale the price directly — a \"premium\" style costs more without changing how long the slot is."}{" "}
            Inactive styles are kept for history but no longer applied to new submissions.
          </p>
        </div>
        <StyleMultiplierModeToggle mode={mode} />
      </div>
      <Link
        href="/dashboard/settings/styles/calibrate"
        className="mt-6 flex items-center justify-between gap-4 rounded-2xl border border-line bg-card p-5 transition-colors hover:border-ink/40"
      >
        <div>
          <p className="font-medium text-ink">Calibrate from examples</p>
          <p className="mt-0.5 text-sm text-grey">
            Price five example tattoos and we&apos;ll set these multipliers to match how you quote.
          </p>
        </div>
        <ChevronRight size={18} className="shrink-0 text-grey" />
      </Link>
      <div className="mt-6">
        <StylesForm styles={styles} mode={mode} />
      </div>
    </div>
  );
}
