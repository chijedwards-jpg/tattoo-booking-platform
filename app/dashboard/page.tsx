import { prisma } from "@/lib/db";
import { getSessionArtistId } from "@/lib/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import LogoutButton from "./LogoutButton";

export const dynamic = "force-dynamic"; // always show fresh submissions, no caching

const STATUS_LABEL: Record<string, { label: string; color: string }> = {
  PENDING_ANALYSIS: { label: "Analyzing…", color: "bg-paper/20 text-paper/60" },
  GREEN_AUTO_BOOKABLE: { label: "Auto-bookable", color: "bg-green-900/40 text-green-300" },
  YELLOW_ARTIST_REVIEW: { label: "Needs review", color: "bg-yellow-900/40 text-yellow-300" },
  RED_CONSULTATION_REQUIRED: { label: "Needs consultation", color: "bg-ink-red/30 text-red-300" },
  APPROVED: { label: "Approved", color: "bg-green-900/40 text-green-300" },
  DECLINED: { label: "Declined", color: "bg-white/10 text-paper/40" },
  BOOKED: { label: "Booked", color: "bg-green-900/40 text-green-300" },
};

export default async function DashboardPage() {
  const artistId = await getSessionArtistId();
  if (!artistId) redirect("/login");

  const artist = await prisma.artist.findUnique({ where: { id: artistId } });
  if (!artist) redirect("/login");

  const submissions = await prisma.submission.findMany({
    where: { artistId },
    include: { client: true },
    orderBy: { createdAt: "desc" },
  });

  const counts = {
    total: submissions.length,
    pending: submissions.filter((s) =>
      ["YELLOW_ARTIST_REVIEW", "RED_CONSULTATION_REQUIRED"].includes(s.status)
    ).length,
    autoBooked: submissions.filter((s) => s.status === "GREEN_AUTO_BOOKABLE").length,
  };

  return (
    <main className="min-h-screen bg-ink text-paper">
      <div className="mx-auto max-w-3xl px-6 py-10">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-display text-3xl text-paper">Submissions</h1>
            <p className="mt-1 text-sm text-paper/50">{artist.name}</p>
            <a
              href={`/a/${artist.slug}`}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-1 inline-block text-xs text-paper/40 hover:text-paper/70"
            >
              Your booking page: /a/{artist.slug} ↗
            </a>
          </div>
          <div className="flex items-center gap-3">
            <Link
              href="/dashboard/settings"
              className="rounded-sm border border-paper/15 px-4 py-2 text-xs text-paper/60 hover:text-paper"
            >
              Settings
            </Link>
            <LogoutButton />
          </div>
        </div>

        <div className="mt-6 grid grid-cols-3 gap-3">
          <StatCard label="Total" value={counts.total} />
          <StatCard label="Auto-bookable" value={counts.autoBooked} />
          <StatCard label="Needs your input" value={counts.pending} />
        </div>

        <div className="mt-8 flex flex-col gap-3">
          {submissions.length === 0 && (
            <p className="py-12 text-center text-sm text-paper/40">
              No submissions yet. They'll show up here as clients submit tattoos.
            </p>
          )}

          {submissions.map((s) => {
            const status = STATUS_LABEL[s.status] ?? STATUS_LABEL.PENDING_ANALYSIS;
            return (
              <Link
                key={s.id}
                href={`/dashboard/${s.id}`}
                className="flex items-center gap-4 rounded-sm border border-paper/10 bg-white/[0.02] p-4 transition-colors hover:border-paper/25"
              >
                {s.inspirationImages[0] && (
                  <img
                    src={s.inspirationImages[0]}
                    className="h-16 w-16 flex-shrink-0 rounded-sm object-cover"
                  />
                )}
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="truncate text-sm text-paper">
                      {s.client.email}
                    </span>
                    <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-medium ${status.color}`}>
                      {status.label}
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-paper/50">
                    {s.placement} · {s.aiDetectedStyle ?? "—"}
                    {s.estimatedPriceLow &&
                      ` · $${s.estimatedPriceLow.toFixed(0)}–$${s.estimatedPriceHigh?.toFixed(0)}`}
                  </p>
                </div>
              </Link>
            );
          })}
        </div>
      </div>
    </main>
  );
}

function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-sm border border-paper/10 bg-white/[0.02] p-4">
      <p className="text-2xl text-paper">{value}</p>
      <p className="mt-1 text-xs text-paper/50">{label}</p>
    </div>
  );
}
