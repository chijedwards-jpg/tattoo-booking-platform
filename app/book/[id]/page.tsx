"use client";

import { useEffect, useState } from "react";
import { SlotBooker, BookedConfirmation, type Slot } from "../../SlotBooker";

interface PublicSubmission {
  id: string;
  status: string;
  placement: string;
  detectedStyle: string | null;
  hours: number | null;
  priceLow: number | null;
  priceHigh: number | null;
  bookable: boolean;
  appointment: { startTime: string; type: "TATTOO" | "CONSULTATION" } | null;
}

const DEPOSIT_POLL_ATTEMPTS = 5;
const DEPOSIT_POLL_INTERVAL_MS = 2000;

export default function BookPage({ params }: { params: { id: string } }) {
  const [submission, setSubmission] = useState<PublicSubmission | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [booked, setBooked] = useState<Slot | null>(null);
  const [depositStatus, setDepositStatus] = useState<"success" | "cancelled" | null>(null);
  const [depositTimedOut, setDepositTimedOut] = useState(false);

  useEffect(() => {
    const deposit = new URLSearchParams(window.location.search).get("deposit");
    if (deposit === "success" || deposit === "cancelled") setDepositStatus(deposit);
  }, []);

  useEffect(() => {
    fetch(`/api/public/submissions/${params.id}`)
      .then((res) => {
        if (!res.ok) throw new Error("not found");
        return res.json();
      })
      .then((data: PublicSubmission) => setSubmission(data))
      .catch(() => setNotFound(true));
  }, [params.id]);

  // Coming back from a successful Stripe Checkout: the Appointment row is
  // only created once the checkout.session.completed webhook lands, which
  // can trail the redirect by a second or two — poll briefly rather than
  // showing a stale "pick a time" screen right after paying.
  useEffect(() => {
    if (depositStatus !== "success" || !submission || submission.status === "BOOKED") return;

    let attempts = 0;
    const interval = setInterval(async () => {
      attempts += 1;
      try {
        const res = await fetch(`/api/public/submissions/${params.id}`);
        const data: PublicSubmission = await res.json();
        setSubmission(data);
        if (data.status === "BOOKED" || attempts >= DEPOSIT_POLL_ATTEMPTS) {
          clearInterval(interval);
          if (data.status !== "BOOKED") setDepositTimedOut(true);
        }
      } catch {
        // transient — the next tick will retry
      }
    }, DEPOSIT_POLL_INTERVAL_MS);

    return () => clearInterval(interval);
    // Depend on submission.status (a primitive), not submission itself —
    // setSubmission gives a new object every tick even when the status is
    // unchanged, which would otherwise restart this effect and reset
    // `attempts` to 0 forever, polling indefinitely instead of stopping
    // after DEPOSIT_POLL_ATTEMPTS.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [depositStatus, submission?.status, params.id]);

  if (notFound) {
    return (
      <Shell>
        <h1 className="font-display text-3xl leading-tight text-paper">
          We couldn't find that request
        </h1>
        <p className="mt-2 text-sm text-paper/60">
          This booking link may be out of date. Reach out to the artist
          directly if you think this is a mistake.
        </p>
      </Shell>
    );
  }

  if (!submission) {
    return (
      <Shell>
        <p className="text-sm text-paper/50">Loading…</p>
      </Shell>
    );
  }

  if (booked) {
    return (
      <Shell>
        <BookedConfirmation slot={booked} />
        <p className="mt-4 text-xs text-paper/40">
          The artist will talk through the design and placement with you at
          this appointment before giving a final price.
        </p>
      </Shell>
    );
  }

  if (depositStatus === "success" && submission.status !== "BOOKED") {
    return (
      <Shell>
        <h1 className="font-display text-3xl leading-tight text-paper">
          Confirming your deposit…
        </h1>
        <p className="mt-2 text-sm text-paper/60">
          {depositTimedOut
            ? "This is taking longer than expected. If your card was charged, don't pay again — refresh this page in a minute, or reach out to the artist directly if it still hasn't confirmed."
            : "This usually takes just a few seconds."}
        </p>
      </Shell>
    );
  }

  if (submission.status === "BOOKED") {
    return (
      <Shell>
        <h1 className="font-display text-3xl leading-tight text-paper">
          {depositStatus === "success" ? "You're booked" : "Already booked"}
        </h1>
        {submission.appointment && (
          <p className="mt-2 text-sm text-paper/70">
            {new Date(submission.appointment.startTime).toLocaleString(undefined, {
              weekday: "long",
              month: "long",
              day: "numeric",
              hour: "numeric",
              minute: "2-digit",
            })}
          </p>
        )}
        {depositStatus === "success" && (
          <p className="mt-4 text-xs text-paper/40">Deposit received — see you then.</p>
        )}
      </Shell>
    );
  }

  if (submission.status === "DECLINED") {
    return (
      <Shell>
        <h1 className="font-display text-3xl leading-tight text-paper">
          This request was declined
        </h1>
        <p className="mt-2 text-sm text-paper/60">
          Reach out to the artist directly if you have questions.
        </p>
      </Shell>
    );
  }

  if (submission.status === "RED_CONSULTATION_REQUIRED") {
    return (
      <Shell>
        <h1 className="font-display text-3xl leading-tight text-paper">
          This one needs a consultation
        </h1>
        <p className="mt-2 text-sm text-paper/60">
          The artist will need to talk through the design and placement with
          you before giving an accurate price. Pick a time below.
        </p>
        <div className="mt-6">
          <SlotBooker submissionId={submission.id} type="CONSULTATION" onBooked={setBooked} />
        </div>
      </Shell>
    );
  }

  if (!submission.bookable) {
    return (
      <Shell>
        <h1 className="font-display text-3xl leading-tight text-paper">
          Still under review
        </h1>
        <p className="mt-2 text-sm text-paper/60">
          The artist hasn't confirmed a price yet. Check back later, or wait
          for the email once it's ready.
        </p>
      </Shell>
    );
  }

  return (
    <Shell>
      <h1 className="font-display text-3xl leading-tight text-paper">
        Pick a time
      </h1>

      {depositStatus === "cancelled" && (
        <p className="mt-4 rounded-sm border border-paper/10 bg-white/[0.02] px-4 py-3 text-sm text-paper/70">
          Payment was cancelled — pick a time below to try again.
        </p>
      )}

      <div className="mt-6 rounded-sm border border-paper/10 bg-white/[0.02] p-5">
        <p className="text-xs uppercase tracking-wide text-paper/40">
          Estimated price
        </p>
        <p className="mt-1 text-2xl text-paper">
          ${submission.priceLow?.toFixed(0)}–${submission.priceHigh?.toFixed(0)}
        </p>
        {submission.hours != null && (
          <>
            <p className="mt-3 text-xs uppercase tracking-wide text-paper/40">
              Estimated time
            </p>
            <p className="mt-1 text-paper/80">{submission.hours.toFixed(1)} hours</p>
          </>
        )}
      </div>

      <div className="mt-4">
        <SlotBooker submissionId={submission.id} type="TATTOO" />
      </div>

      <p className="mt-6 text-xs text-paper/40">
        Picking a time takes you to a secure page to pay your deposit and
        confirm the appointment. This is an estimated price based on the
        information provided — final pricing may vary based on the artist's
        assessment and the final design.
      </p>
    </Shell>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <main className="min-h-screen bg-ink text-paper">
      <div className="mx-auto flex min-h-screen max-w-md flex-col px-5 py-8">
        {children}
      </div>
    </main>
  );
}
