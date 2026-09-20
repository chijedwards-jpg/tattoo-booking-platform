import { prisma } from "@/lib/db";
import { getSessionArtistId } from "@/lib/auth";
import { redirect } from "next/navigation";
import { StylesForm } from "../StylesAndRestrictions";

export const dynamic = "force-dynamic";

export default async function StylesSettingsPage() {
  const artistId = await getSessionArtistId();
  if (!artistId) redirect("/login");

  const styles = await prisma.tattooStyle.findMany({
    where: { artistId },
    orderBy: { name: "asc" },
  });

  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="font-display text-3xl text-ink">Styles & time</h1>
      <p className="mt-1 text-sm text-grey">
        Time multipliers applied to the AI's base hour estimate. Inactive
        styles are kept for history but no longer applied to new
        submissions.
      </p>
      <div className="mt-6">
        <StylesForm styles={styles} />
      </div>
    </div>
  );
}
