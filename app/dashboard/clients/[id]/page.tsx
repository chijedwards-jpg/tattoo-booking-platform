import { prisma } from "@/lib/db";
import { getSessionArtistId } from "@/lib/auth";
import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { ChevronLeft, Mail, Phone, Star } from "lucide-react";
import { Badge, Card } from "../../../ui";
import { STATUS_META } from "../../statusMeta";
import { artistHasClient } from "@/lib/clients";
import { CONFIRMATION_META } from "@/lib/confirmationMeta";
import { DEFAULT_TIME_ZONE } from "@/lib/timeZones";
import { placementLabel } from "@/lib/placements";
import { ClientNotes, ClientPhotos, PrivateRating, ReviewVisibility } from "./ClientProfileParts";

export const dynamic = "force-dynamic";

const APPOINTMENT_STATUS: Record<string, { label: string; tone: "green" | "yellow" | "red" | "neutral" }> = {
  SCHEDULED: { label: "Scheduled", tone: "neutral" },
  COMPLETED: { label: "Completed", tone: "green" },
  CANCELLED: { label: "Cancelled", tone: "red" },
  NO_SHOW: { label: "No-show", tone: "red" },
};

const MESSAGE_KIND: Record<string, string> = {
  REQUEST_RECEIVED: "Request received",
  ESTIMATE_APPROVED: "Estimate approved",
  BOOKING_CONFIRMATION: "Booking confirmation",
  REMINDER: "Reminder",
  REVIEW_REQUEST: "Review request",
};

export default async function ClientProfilePage({ params }: { params: { id: string } }) {
  const artistId = await getSessionArtistId();
  if (!artistId) redirect("/login");
  if (!(await artistHasClient(artistId, params.id))) return notFound();

  const [artist, client] = await Promise.all([
    prisma.artist.findUnique({ where: { id: artistId }, select: { timeZone: true } }),
    prisma.client.findUnique({
      where: { id: params.id },
      include: {
        appointments: {
          where: { artistId },
          orderBy: { startTime: "desc" },
          include: { submission: { select: { id: true, placement: true, aiDetectedStyle: true, description: true } } },
        },
        submissions: {
          where: { artistId },
          orderBy: { createdAt: "desc" },
          select: {
            id: true,
            createdAt: true,
            status: true,
            placement: true,
            aiDetectedStyle: true,
            estimatedPriceLow: true,
            estimatedPriceHigh: true,
            inspirationImages: true,
          },
        },
        notes: { where: { artistId }, orderBy: { createdAt: "desc" } },
        photos: { where: { artistId }, orderBy: { createdAt: "desc" }, select: { id: true, caption: true, createdAt: true } },
        ratings: { where: { artistId } },
        reviews: { where: { artistId }, orderBy: { createdAt: "desc" } },
        messageLogs: { where: { artistId }, orderBy: { createdAt: "desc" }, take: 50 },
      },
    }),
  ]);
  if (!client) return notFound();

  const timeZone = artist?.timeZone ?? DEFAULT_TIME_ZONE;
  const fmt = (d: Date, withTime = true) =>
    d.toLocaleString("en-US", {
      timeZone,
      weekday: withTime ? "short" : undefined,
      month: "short",
      day: "numeric",
      year: "numeric",
      ...(withTime ? { hour: "numeric", minute: "2-digit" } : {}),
    });
  const now = new Date();
  const myRating = client.ratings[0] ?? null;

  return (
    <div className="mx-auto max-w-3xl">
      <Link href="/dashboard/clients" className="flex items-center gap-1 text-sm text-grey hover:text-ink">
        <ChevronLeft size={15} /> All clients
      </Link>

      <h1 className="mt-4 font-display text-3xl text-ink">{client.name || client.email}</h1>
      <div className="mt-2 flex flex-wrap gap-x-5 gap-y-1 text-sm text-grey">
        <a href={`mailto:${client.email}`} className="flex items-center gap-1.5 hover:text-ink">
          <Mail size={14} /> {client.email}
        </a>
        {client.phone && (
          <a href={`tel:${client.phone}`} className="flex items-center gap-1.5 hover:text-ink">
            <Phone size={14} /> {client.phone}
          </a>
        )}
        <span>Client since {fmt(client.createdAt, false)}</span>
      </div>

      {/* Appointments */}
      <Section title="Appointments">
        {client.appointments.length === 0 ? (
          <Empty>No appointments yet.</Empty>
        ) : (
          <div className="flex flex-col gap-2">
            {client.appointments.map((a) => {
              const upcoming = a.status === "SCHEDULED" && a.startTime > now;
              const status = APPOINTMENT_STATUS[a.status];
              const row = (
                <div className="flex flex-wrap items-center gap-x-4 gap-y-2 rounded-xl border border-line bg-card p-4">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-ink">{fmt(a.startTime)}</p>
                    <p className="mt-0.5 text-xs text-grey">
                      {a.type === "TATTOO" ? "Tattoo" : "Consultation"}
                      {a.submission?.placement ? ` · ${placementLabel(a.submission.placement)}` : ""}
                      {a.submission?.aiDetectedStyle ? ` · ${a.submission.aiDetectedStyle}` : ""}
                      {a.type === "TATTOO" && a.depositAmount
                        ? ` · $${a.depositAmount.toFixed(0)} deposit ${a.depositPaid ? "received" : "pending"}`
                        : ""}
                    </p>
                    {a.confirmationStatus === "RESCHEDULE_REQUESTED" && a.confirmationNote && (
                      <p className="mt-1 text-xs text-ink">&ldquo;{a.confirmationNote}&rdquo;</p>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {upcoming ? (
                      <Badge tone={CONFIRMATION_META[a.confirmationStatus].tone}>
                        {CONFIRMATION_META[a.confirmationStatus].label}
                      </Badge>
                    ) : (
                      <Badge tone={status.tone}>{a.status === "SCHEDULED" ? "Past" : status.label}</Badge>
                    )}
                  </div>
                </div>
              );
              return a.submission ? (
                <Link key={a.id} href={`/dashboard/submissions/${a.submission.id}`} className="hover:opacity-90">
                  {row}
                </Link>
              ) : (
                <div key={a.id}>{row}</div>
              );
            })}
          </div>
        )}
      </Section>

      {/* Notes */}
      <Section title="Notes" hint="Only you can see these.">
        <ClientNotes
          clientId={client.id}
          notes={client.notes.map((n) => ({ id: n.id, body: n.body, createdAt: fmt(n.createdAt) }))}
        />
      </Section>

      {/* Photos */}
      <Section title="Photos" hint="Finished or healed work, stencils, anything you want to keep with this client.">
        <ClientPhotos
          clientId={client.id}
          photos={client.photos.map((p) => ({ id: p.id, caption: p.caption }))}
        />
        {client.submissions.some((s) => s.inspirationImages.length > 0) && (
          <>
            <p className="mb-2 mt-5 font-mono text-[11px] uppercase tracking-wide text-grey">From their requests</p>
            <div className="grid grid-cols-3 gap-3 sm:grid-cols-5">
              {client.submissions.flatMap((s) =>
                s.inspirationImages.map((_, i) => (
                  <Link
                    key={`${s.id}-${i}`}
                    href={`/dashboard/submissions/${s.id}`}
                    className="aspect-square overflow-hidden rounded-xl border border-line"
                  >
                    <img src={`/api/submissions/${s.id}/images/${i}`} alt="" className="h-full w-full object-cover" />
                  </Link>
                ))
              )}
            </div>
          </>
        )}
      </Section>

      {/* Reviews */}
      <Section title="Reviews">
        <div className="grid gap-4 sm:grid-cols-2">
          <Card>
            <p className="font-mono text-[11px] uppercase tracking-wide text-grey">Your rating of this client</p>
            <p className="mb-3 mt-1 text-xs text-grey">Private. The client never sees this.</p>
            <PrivateRating
              clientId={client.id}
              initialRating={myRating?.rating ?? 0}
              initialComment={myRating?.comment ?? ""}
            />
          </Card>
          <Card>
            <p className="font-mono text-[11px] uppercase tracking-wide text-grey">Their reviews of you</p>
            {client.reviews.length === 0 ? (
              <p className="mt-2 text-sm text-grey">
                None yet. Clients get a review link by email after their tattoo.
              </p>
            ) : (
              <div className="mt-3 flex flex-col gap-4">
                {client.reviews.map((r) => (
                  <div key={r.id}>
                    <Stars rating={r.rating} />
                    {r.comment && <p className="mt-1 text-sm text-ink">{r.comment}</p>}
                    <p className="mt-1 text-xs text-grey">{fmt(r.createdAt, false)}</p>
                    <ReviewVisibility reviewId={r.id} initialShown={r.showOnPage} />
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>
      </Section>

      {/* Requests */}
      <Section title="Requests">
        {client.submissions.length === 0 ? (
          <Empty>No requests.</Empty>
        ) : (
          <div className="flex flex-col gap-2">
            {client.submissions.map((s) => {
              const status = STATUS_META[s.status] ?? STATUS_META.PENDING_ANALYSIS;
              return (
                <Link
                  key={s.id}
                  href={`/dashboard/submissions/${s.id}`}
                  className="flex items-center gap-4 rounded-xl border border-line bg-card p-4 transition-colors hover:border-ink-red/40"
                >
                  <div className="min-w-0 flex-1">
                    <p className="text-sm text-ink">
                      {placementLabel(s.placement)} · {s.aiDetectedStyle ?? "—"}
                      {s.estimatedPriceLow != null &&
                        ` · $${s.estimatedPriceLow.toFixed(0)}–$${s.estimatedPriceHigh?.toFixed(0)}`}
                    </p>
                    <p className="mt-0.5 text-xs text-grey">{fmt(s.createdAt, false)}</p>
                  </div>
                  <Badge tone={status.tone}>{status.label}</Badge>
                </Link>
              );
            })}
          </div>
        )}
      </Section>

      {/* Messages */}
      <Section title="Messages sent" hint="Every email this app has sent this client.">
        {client.messageLogs.length === 0 ? (
          <Empty>Nothing sent yet.</Empty>
        ) : (
          <div className="overflow-hidden rounded-xl border border-line bg-card">
            {client.messageLogs.map((m, i) => (
              <div
                key={m.id}
                className={`flex flex-wrap items-center gap-x-4 gap-y-1 px-4 py-3 text-sm ${i > 0 ? "border-t border-line" : ""}`}
              >
                <span className="w-40 shrink-0 text-xs text-grey">{fmt(m.createdAt)}</span>
                <span className="min-w-0 flex-1 text-ink">
                  {MESSAGE_KIND[m.kind] ?? m.kind}
                  <span className="text-grey"> · {m.channel === "EMAIL" ? "Email" : "Text"}</span>
                </span>
                <Badge tone={m.status === "SENT" ? "green" : m.status === "FAILED" ? "red" : "neutral"}>
                  {m.status === "SENT" ? "Sent" : m.status === "FAILED" ? "Failed" : "Not sent"}
                </Badge>
              </div>
            ))}
          </div>
        )}
      </Section>
    </div>
  );
}

function Section({ title, hint, children }: { title: string; hint?: string; children: React.ReactNode }) {
  return (
    <section className="mt-10">
      <h2 className="font-display text-xl text-ink">{title}</h2>
      {hint && <p className="mt-0.5 text-sm text-grey">{hint}</p>}
      <div className="mt-3">{children}</div>
    </section>
  );
}

function Empty({ children }: { children: React.ReactNode }) {
  return <p className="text-sm text-grey">{children}</p>;
}

function Stars({ rating }: { rating: number }) {
  return (
    <span className="flex gap-0.5" aria-label={`${rating} out of 5`}>
      {[1, 2, 3, 4, 5].map((n) => (
        <Star key={n} size={14} className={n <= rating ? "fill-ochre text-ochre" : "text-line"} />
      ))}
    </span>
  );
}
