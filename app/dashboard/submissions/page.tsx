import { prisma } from "@/lib/db";
import { getSessionArtistId } from "@/lib/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Badge } from "../../ui";
import { STATUS_META } from "../statusMeta";
import { placementLabel } from "@/lib/placements";

export const dynamic = "force-dynamic";

export default async function SubmissionsPage() {
  const artistId = await getSessionArtistId();
  if (!artistId) redirect("/login");

  // Not the stored photos themselves (megabytes per request) — the
  // thumbnails load separately from the image route.
  const submissions = await prisma.submission.findMany({
    where: { artistId },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      status: true,
      placement: true,
      aiDetectedStyle: true,
      estimatedPriceLow: true,
      estimatedPriceHigh: true,
      client: { select: { name: true, email: true } },
    },
  });

  return (
    <div>
      <h1 className="font-display text-3xl text-ink">Submissions</h1>

      <div className="mt-6 flex flex-col gap-2">
        {submissions.length === 0 && (
          <div className="rounded-2xl border border-dashed border-line bg-card p-8 text-center text-sm text-grey">
            No submissions yet. They'll show up here as clients submit tattoos.
          </div>
        )}

        {submissions.map((s) => {
          const status = STATUS_META[s.status] ?? STATUS_META.PENDING_ANALYSIS;
          return (
            <Link
              key={s.id}
              href={`/dashboard/submissions/${s.id}`}
              className="flex items-center gap-4 rounded-xl border border-line bg-card p-4 transition-colors hover:border-ink-red/40"
            >
              <img
                src={`/api/submissions/${s.id}/images/0`}
                alt=""
                loading="lazy"
                className="h-14 w-14 flex-shrink-0 rounded-lg object-cover"
              />
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="truncate text-sm font-medium text-ink">{s.client.name || s.client.email}</span>
                  <Badge tone={status.tone}>{status.label}</Badge>
                </div>
                <p className="mt-1 text-xs text-grey">
                  {placementLabel(s.placement)} · {s.aiDetectedStyle ?? "—"}
                  {s.estimatedPriceLow &&
                    ` · $${s.estimatedPriceLow.toFixed(0)}–$${s.estimatedPriceHigh?.toFixed(0)}`}
                </p>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
