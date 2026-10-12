import { prisma } from "@/lib/db";
import { getSessionArtistId } from "@/lib/auth";
import { redirect } from "next/navigation";
import { PortfolioForm } from "./PortfolioForm";

export const dynamic = "force-dynamic";

export default async function PortfolioSettingsPage() {
  const artistId = await getSessionArtistId();
  if (!artistId) redirect("/login");

  const images = await prisma.portfolioImage.findMany({
    where: { artistId },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="font-display text-3xl text-ink">Portfolio</h1>
      <p className="mt-1 text-sm text-grey">
        Shown on your booking page so clients can see your work before they submit a request.
      </p>
      <div className="mt-6">
        <PortfolioForm
          images={images.map((i) => ({ id: i.id, imageDataUrl: i.imageDataUrl, caption: i.caption }))}
        />
      </div>
    </div>
  );
}
