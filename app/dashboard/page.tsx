import { prisma } from "@/lib/db";
import { getSessionArtistId } from "@/lib/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { Badge, StatCard } from "../ui";
import { STATUS_META } from "./statusMeta";
import { placementLabel } from "@/lib/placements";
import { CONFIRMATION_META } from "@/lib/confirmationMeta";
import { DEFAULT_TIME_ZONE } from "@/lib/timeZones";
import { getValidAccessToken } from "@/lib/googleOAuth";

export const dynamic = "force-dynamic";

const UPCOMING_DAYS = 14;

export default async function OverviewPage() {
  const artistId = await getSessionArtistId();
  if (!artistId) redirect("/login");

  const artist = await prisma.artist.findUnique({
    where: { id: artistId },
    select: { name: true, timeZone: true, googleCalendarConnection: { select: { id: true } } },
  });
  if (!artist) redirect("/login");

  const now = new Date();
  // Counts and the recent list only — never the stored photos, which run to
  // megabytes per request and would make this page slower with every one.
  const [statusCounts, bookedValue, recent, upcoming] = await Promise.all([
    prisma.submission.groupBy({ by: ["status"], where: { artistId }, _count: true }),
    prisma.submission.aggregate({ where: { artistId, status: "BOOKED" }, _sum: { estimatedPriceLow: true } }),
    prisma.submission.findMany({
      where: { artistId },
      orderBy: { createdAt: "desc" },
      take: 5,
      select: {
        id: true,
        status: true,
        placement: true,
        aiDetectedStyle: true,
        client: { select: { name: true, email: true } },
      },
    }),
    prisma.appointment.findMany({
      where: {
        artistId,
        status: "SCHEDULED",
        startTime: { gte: now, lt: new Date(now.getTime() + UPCOMING_DAYS * 86_400_000) },
      },
      orderBy: { startTime: "asc" },
      take: 20,
      select: {
        id: true,
        startTime: true,
        type: true,
        confirmationStatus: true,
        depositPaid: true,
        depositAmount: true,
        submissionId: true,
        clientId: true,
        client: { select: { name: true, email: true } },
      },
    }),
  ]);

  const count = (...statuses: string[]) =>
    statusCounts.filter((s) => statuses.includes(s.status)).reduce((n, s) => n + s._count, 0);
  const total = statusCounts.reduce((n, s) => n + s._count, 0);
  const booked = count("BOOKED");
  const pending = count("YELLOW_ARTIST_REVIEW", "RED_CONSULTATION_REQUIRED");
  const autoBooked = count("GREEN_AUTO_BOOKABLE");
  const revenue = bookedValue._sum.estimatedPriceLow ?? 0;

  const calendarBroken =
    artist.googleCalendarConnection != null && (await getValidAccessToken(artistId)) == null;
  const timeZone = artist.timeZone ?? DEFAULT_TIME_ZONE;

  return (
    <div>
      <h1 className="font-display text-3xl text-ink">Good to see you, {artist.name.split(" ")[0]}.</h1>
      <p className="mt-1 text-sm text-grey">Here's what's come in.</p>

      {calendarBroken && (
        <Link
          href="/dashboard/calendar"
          className="mt-4 block rounded-xl border border-ink-red/40 bg-ink-red/10 px-4 py-3 text-sm text-ink hover:border-ink-red"
        >
          <strong>Your Google Calendar connection stopped working.</strong> Clients may be able to book over your
          busy times until you reconnect it. <span className="text-ink-red underline">Reconnect →</span>
        </Link>
      )}

      <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
        <StatCard label="Submissions" value={total} />
        <StatCard label="Booked" value={booked} sub={`$${revenue.toFixed(0)} estimated`} />
        <StatCard label="Auto-bookable" value={autoBooked} />
        <StatCard label="Needs your input" value={pending} />
      </div>

      <div className="mb-3 mt-8 flex items-center justify-between">
        <h2 className="font-display text-xl text-ink">Coming up</h2>
        <Link href="/dashboard/clients" className="flex items-center gap-1 text-sm text-ink-red">
          All clients <ChevronRight size={14} />
        </Link>
      </div>

      {upcoming.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-line bg-card p-6 text-center text-sm text-grey">
          No appointments in the next {UPCOMING_DAYS} days.
        </div>
      ) : (
        <div className="space-y-2">
          {upcoming.map((a) => (
            <Link
              key={a.id}
              href={a.submissionId ? `/dashboard/submissions/${a.submissionId}` : `/dashboard/clients/${a.clientId}`}
              className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-line bg-card px-4 py-3 text-sm transition-colors hover:border-ink-red/40"
            >
              <div className="min-w-0">
                <p className="font-medium text-ink">{a.client.name || a.client.email}</p>
                <p className="text-xs text-grey">
                  {a.startTime.toLocaleString("en-US", {
                    timeZone,
                    weekday: "short",
                    month: "short",
                    day: "numeric",
                    hour: "numeric",
                    minute: "2-digit",
                  })}
                  {" · "}
                  {a.type === "TATTOO" ? "Tattoo" : "Consultation"}
                  {a.type === "TATTOO" && a.depositAmount
                    ? ` · deposit ${a.depositPaid ? "received" : "pending"}`
                    : ""}
                </p>
              </div>
              <Badge tone={CONFIRMATION_META[a.confirmationStatus].tone}>
                {CONFIRMATION_META[a.confirmationStatus].label}
              </Badge>
            </Link>
          ))}
        </div>
      )}

      <div className="mb-3 mt-8 flex items-center justify-between">
        <h2 className="font-display text-xl text-ink">Recent submissions</h2>
        <Link href="/dashboard/submissions" className="flex items-center gap-1 text-sm text-ink-red">
          View all <ChevronRight size={14} />
        </Link>
      </div>

      {recent.length === 0 && (
        <div className="rounded-2xl border border-dashed border-line bg-card p-8 text-center text-sm text-grey">
          Nothing yet. Submissions from your booking page will show up here.
        </div>
      )}

      <div className="space-y-2">
        {recent.map((s) => {
          const status = STATUS_META[s.status] ?? STATUS_META.PENDING_ANALYSIS;
          return (
            <Link
              key={s.id}
              href={`/dashboard/submissions/${s.id}`}
              className="flex items-center justify-between rounded-xl border border-line bg-card px-4 py-3 text-left text-sm transition-colors hover:border-ink-red/40"
            >
              <div className="flex items-center gap-3">
                {/* Every request has at least one photo (the form requires it). */}
                <img src={`/api/submissions/${s.id}/images/0`} alt="" className="h-9 w-9 rounded-lg object-cover" />
                <div>
                  <p className="font-medium text-ink">
                    {s.client.name || s.client.email} · {placementLabel(s.placement)}
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
