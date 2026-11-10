import type { Metadata } from "next";
import { prisma } from "@/lib/db";
import { DEFAULT_TIME_ZONE } from "@/lib/timeZones";
import { ConfirmActions, ReviewForm } from "./ClientActions";

export const dynamic = "force-dynamic";

// The link is the client's only key to this page — keep it out of search
// engines and link previews.
export const metadata: Metadata = { title: "Your appointment", robots: { index: false, follow: false } };

export default async function ClientAppointmentPage({ params }: { params: { token: string } }) {
  const appt = await prisma.appointment.findUnique({
    where: { clientToken: params.token },
    include: { artist: true, review: true },
  });

  if (!appt) {
    return (
      <Shell>
        <h1 className="font-display text-3xl leading-tight text-ink">We couldn't find that appointment</h1>
        <p className="mt-2 text-sm text-grey">
          This link may be out of date. Reach out to your artist directly if you think this is a mistake.
        </p>
      </Shell>
    );
  }

  const timeZone = appt.artist.timeZone ?? DEFAULT_TIME_ZONE;
  const when = appt.startTime.toLocaleString("en-US", {
    timeZone,
    timeZoneName: "short",
    weekday: "long",
    month: "long",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
  const label = appt.type === "TATTOO" ? "Tattoo appointment" : "Consultation";
  const now = new Date();
  const isOver = appt.endTime <= now;

  return (
    <Shell>
      <p className="font-mono text-[11px] uppercase tracking-wide text-grey">
        {label} with {appt.artist.name}
      </p>
      <h1 className="mt-1 font-display text-3xl leading-tight text-ink">{when}</h1>

      <div className="mt-6">
        {appt.status === "CANCELLED" ? (
          <p className="text-sm text-ink">This appointment was cancelled.</p>
        ) : appt.status === "NO_SHOW" ? (
          <p className="text-sm text-ink">This appointment has passed.</p>
        ) : !isOver ? (
          <ConfirmActions
            token={params.token}
            artistName={appt.artist.name}
            initialStatus={appt.confirmationStatus}
          />
        ) : appt.type === "TATTOO" ? (
          appt.review ? (
            <p className="text-sm text-ink">Thanks for your review. {appt.artist.name} appreciates it!</p>
          ) : (
            <ReviewForm token={params.token} artistName={appt.artist.name} />
          )
        ) : (
          <p className="text-sm text-ink">This consultation has passed.</p>
        )}
      </div>
    </Shell>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <main className="min-h-screen bg-paper text-ink">
      <div className="mx-auto flex min-h-screen max-w-md flex-col px-5 py-8">{children}</div>
    </main>
  );
}
