import { prisma } from "@/lib/db";
import { getSessionArtistId } from "@/lib/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { Badge, StatCard } from "../ui";
import { STATUS_META } from "./statusMeta";

export const dynamic = "force-dynamic";

export default async function OverviewPage() {
  const artistId = await getSessionArtistId();
  if (!artistId) redirect("/login");

  const artist = await prisma.artist.findUnique({ where: { id: artistId } });
  if (!artist) redirect("/login");

  const submissions = await prisma.submission.findMany({
    where: { artistId },
    include: { client: true },
    orderBy: { createdAt: "desc" },
  });

  const booked = submissions.filter((s) => s.status === "BOOKED");
  const pending = submissions.filter((s) =>
    ["YELLOW_ARTIST_REVIEW", "RED_CONSULTATION_REQUIRED"].includes(s.status)
  );
  const autoBooked = submissions.filter((s) => s.status === "GREEN_AUTO_BOOKABLE");
  const revenue = booked.reduce((sum, s) => sum + (s.estimatedPriceLow ?? 0), 0);

  return (
    <div>
      <h1 className="font-display text-3xl text-ink">Good to see you, {artist.name.split(" ")[0]}.</h1>
      <p className="mt-1 text-sm text-grey">Here's what's come in.</p>

      <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
        <StatCard label="Submissions" value={submissions.length} />
        <StatCard label="Booked" value={booked.length} sub={`$${revenue.toFixed(0)} estimated`} />
        <StatCard label="Auto-bookable" value={autoBooked.length} />
        <StatCard label="Needs your input" value={pending.length} />
      </div>

      <div className="mb-3 mt-8 flex items-center justify-between">
        <h2 className="font-display text-xl text-ink">Recent submissions</h2>
        <Link href="/dashboard/submissions" className="flex items-center gap-1 text-sm text-ink-red">
          View all <ChevronRight size={14} />
        </Link>
      </div>

      {submissions.length === 0 && (
        <div className="rounded-2xl border border-dashed border-line bg-card p-8 text-center text-sm text-grey">
          Nothing yet. Submissions from your booking page will show up here.
        </div>
      )}

      <div className="space-y-2">
        {submissions.slice(0, 5).map((s) => {
          const status = STATUS_META[s.status] ?? STATUS_META.PENDING_ANALYSIS;
          return (
            <Link
              key={s.id}
              href={`/dashboard/submissions/${s.id}`}
              className="flex items-center justify-between rounded-xl border border-line bg-card px-4 py-3 text-left text-sm transition-colors hover:border-ink-red/40"
            >
              <div className="flex items-center gap-3">
                {s.inspirationImages[0] && (
                  <img src={s.inspirationImages[0]} className="h-9 w-9 rounded-lg object-cover" />
                )}
                <div>
                  <p className="font-medium text-ink">
                    {s.client.email} · {s.placement}
                  </p>
                  <p className="text-xs text-grey">{s.aiDetectedStyle ?? "—"}</p>
                </div>
              </div>
              <Badge tone={status.tone}>{status.label}</Badge>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
