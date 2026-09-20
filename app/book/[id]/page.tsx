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
  deposit: { amount: number; instructions: string | null } | null;
  appointment: {
    startTime: string;
    type: "TATTOO" | "CONSULTATION";
    depositPaid: boolean;
    depositAmount: number | null;
  } | null;
}

export default function BookPage({ params }: { params: { id: string } }) {
  const [submission, setSubmission] = useState<PublicSubmission | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [booked, setBooked] = useState<Slot | null>(null);

  useEffect(() => {
    fetch(`/api/public/submissions/${params.id}`)
      .then((res) => {
        if (!res.ok) throw new Error("not found");
        return res.json();
      })
      .then((data: PublicSubmission) => setSubmission(data))
      .catch(() => setNotFound(true));
  }, [params.id]);

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
        <BookedConfirmation
          slot={booked}
          depositAmount={submission.deposit?.amount}
          depositInstructions={submission.deposit?.instructions}
        />
      </Shell>
    );
  }

  if (submission.status === "BOOKED") {
    const appt = submission.appointment;
    return (
      <Shell>
        <h1 className="font-display text-3xl leading-tight text-paper">
          Already booked
        </h1>
        {appt && (
          <p className="mt-2 text-sm text-paper/70">
            {new Date(appt.startTime).toLocaleString(undefined, {
              weekday: "long",
              month: "long",
              day: "numeric",
              hour: "numeric",
              minute: "2-digit",
            })}
          </p>
        )}
        {appt?.type === "TATTOO" && (
          <p className="mt-4 text-xs text-paper/40">
            {appt.depositPaid
              ? "Deposit received — see you then."
              : "Your slot is held, but not confirmed until the artist marks your deposit as received."}
          </p>
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
        <SlotBooker submissionId={submission.id} type="TATTOO" onBooked={setBooked} />
      </div>

      <p className="mt-6 text-xs text-paper/40">
        This is an estimated price based on the information provided. Final
        pricing may vary based on the artist's assessment and the final
        design.
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
