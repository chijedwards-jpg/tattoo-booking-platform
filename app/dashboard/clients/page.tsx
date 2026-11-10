import { prisma } from "@/lib/db";
import { getSessionArtistId } from "@/lib/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Star } from "lucide-react";
import { Badge } from "../../ui";
import { CONFIRMATION_META } from "@/lib/confirmationMeta";
import { DEFAULT_TIME_ZONE } from "@/lib/timeZones";

export const dynamic = "force-dynamic";

export default async function ClientsPage({ searchParams }: { searchParams: { q?: string } }) {
  const artistId = await getSessionArtistId();
  if (!artistId) redirect("/login");

  const artist = await prisma.artist.findUnique({ where: { id: artistId }, select: { timeZone: true } });
  const timeZone = artist?.timeZone ?? DEFAULT_TIME_ZONE;
  const q = searchParams.q?.trim() ?? "";
  const now = new Date();

  const clients = await prisma.client.findMany({
    where: {
      OR: [{ submissions: { some: { artistId } } }, { appointments: { some: { artistId } } }],
      ...(q
        ? {
            AND: [
              {
                OR: [
                  { email: { contains: q, mode: "insensitive" } },
                  { name: { contains: q, mode: "insensitive" } },
                  { phone: { contains: q } },
                ],
              },
            ],
          }
        : {}),
    },
    include: {
      appointments: {
        where: { artistId },
        orderBy: { startTime: "asc" },
        select: { startTime: true, status: true, confirmationStatus: true },
      },
      submissions: { where: { artistId }, select: { createdAt: true } },
      ratings: { where: { artistId }, select: { rating: true } },
    },
  });

  const rows = clients
    .map((c) => {
      const next = c.appointments.find((a) => a.status === "SCHEDULED" && a.startTime > now) ?? null;
      const visits = c.appointments.filter((a) => a.status !== "CANCELLED" && a.startTime <= now).length;
      const lastActivity = Math.max(
        ...c.appointments.map((a) => a.startTime.getTime()),
        ...c.submissions.map((s) => s.createdAt.getTime()),
        0
      );
      return { client: c, next, visits, lastActivity, rating: c.ratings[0]?.rating ?? null };
    })
    // Upcoming appointments first (soonest first), then most recent activity.
    .sort((a, b) => {
      if (a.next && b.next) return a.next.startTime.getTime() - b.next.startTime.getTime();
      if (a.next) return -1;
      if (b.next) return 1;
      return b.lastActivity - a.lastActivity;
    });

  return (
    <div>
      <h1 className="font-display text-3xl text-ink">Clients</h1>
      <p className="mt-1 text-sm text-grey">Everyone who has sent you a request or booked with you.</p>

      <form className="mt-6" action="/dashboard/clients">
        <input
          name="q"
          defaultValue={q}
          placeholder="Search by name, email or phone"
          className="w-full max-w-sm rounded-full border border-line bg-card px-4 py-2.5 text-sm text-ink"
        />
      </form>

      <div className="mt-4 flex flex-col gap-2">
        {rows.length === 0 && (
          <div className="rounded-2xl border border-dashed border-line bg-card p-8 text-center text-sm text-grey">
            {q ? "No clients match that search." : "No clients yet. They'll show up here once someone sends you a request."}
          </div>
        )}

        {rows.map(({ client, next, visits, rating }) => (
          <Link
            key={client.id}
            href={`/dashboard/clients/${client.id}`}
            className="flex flex-wrap items-center gap-x-4 gap-y-2 rounded-xl border border-line bg-card p-4 transition-colors hover:border-ink-red/40"
          >
            <div className="min-w-[12rem] flex-1">
              <div className="flex items-center gap-2">
                <span className="truncate text-sm font-medium text-ink">{client.name || client.email}</span>
                {rating != null && (
                  <span className="flex items-center gap-0.5 text-xs text-ochre">
                    <Star size={12} className="fill-ochre" /> {rating}
                  </span>
                )}
              </div>
              <p className="mt-1 truncate text-xs text-grey">
                {client.name ? `${client.email} · ` : ""}
                {visits} {visits === 1 ? "visit" : "visits"}
              </p>
            </div>
            {next ? (
              <div className="flex items-center gap-2">
                <span className="text-xs text-grey">
                  {next.startTime.toLocaleString("en-US", {
                    timeZone,
                    month: "short",
                    day: "numeric",
                    hour: "numeric",
                    minute: "2-digit",
                  })}
                </span>
                <Badge tone={CONFIRMATION_META[next.confirmationStatus].tone}>
                  {CONFIRMATION_META[next.confirmationStatus].label}
                </Badge>
              </div>
            ) : (
              <span className="text-xs text-grey">No upcoming appointment</span>
            )}
          </Link>
        ))}
      </div>
    </div>
  );
}
