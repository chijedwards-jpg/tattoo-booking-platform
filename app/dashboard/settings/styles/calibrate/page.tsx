import { prisma } from "@/lib/db";
import { getSessionArtistId } from "@/lib/auth";
import { redirect } from "next/navigation";
import { CalibrationFlow } from "./CalibrationFlow";

export const dynamic = "force-dynamic";

export default async function CalibratePage({ searchParams }: { searchParams: { welcome?: string } }) {
  const artistId = await getSessionArtistId();
  if (!artistId) redirect("/login");

  const pricingConfig = await prisma.pricingConfig.findUnique({
    where: { artistId },
    select: { hourlyRate: true },
  });
  if (!pricingConfig) redirect("/login");

  return (
    <div className="mx-auto max-w-2xl">
      <CalibrationFlow hourlyRate={pricingConfig.hourlyRate} welcome={searchParams.welcome === "1"} />
    </div>
  );
}
