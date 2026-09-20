"use client";

import { useEffect, useState } from "react";
import { Calendar } from "lucide-react";
import { SlotBooker, BookedConfirmation, type Slot } from "../../SlotBooker";
import { Badge, Card } from "../../ui";
import { googleCalendarUrl } from "@/lib/googleCalendar";

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
        <h1 className="font-display text-3xl leading-tight text-ink">
          We couldn't find that request
        </h1>
        <p className="mt-2 text-sm text-grey">
          This booking link may be out of date. Reach out to the artist
          directly if you think this is a mistake.
        </p>
      </Shell>
    );
  }

  if (!submission) {
    return (
      <Shell>
        <p className="text-sm text-grey">Loading…</p>
      </Shell>
    );
  }

  if (booked) {
    const isConsultation = submission.status === "RED_CONSULTATION_REQUIRED";
    return (
      <Shell>
        <BookedConfirmation
          slot={booked}
          title={isConsultation ? "Consultation" : "Tattoo appointment"}
          depositAmount={isConsultation ? null : submission.deposit?.amount}
          depositInstructions={isConsultation ? null : submission.deposit?.instructions}
        />
      </Shell>
    );
  }

  if (submission.status === "BOOKED") {
    const appt = submission.appointment;
    const calendarUrl = appt
      ? googleCalendarUrl({
          title: appt.type === "TATTOO" ? "Tattoo appointment" : "Consultation",
          start: new Date(appt.startTime),
          end: new Date(new Date(appt.startTime).getTime() + 60 * 60 * 1000),
        })
      : null;
    return (
      <Shell>
        <h1 className="font-display text-3xl leading-tight text-ink">Already booked</h1>
        {appt && (
          <p className="mt-2 text-sm text-grey">
            {new Date(appt.startTime).toLocaleString(undefined, {
              weekday: "long",
              month: "long",
              day: "numeric",
              hour: "numeric",
              minute: "2-digit",
            })}
          </p>
        )}
        {calendarUrl && (
          <a
            href={calendarUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-3 inline-flex items-center gap-1.5 text-sm text-ink-red hover:underline"
          >
            <Calendar size={14} /> Add to Google Calendar
          </a>
        )}
        {appt?.type === "TATTOO" && (
          <p className="mt-4 text-xs text-grey">
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
        <h1 className="font-display text-3xl leading-tight text-ink">
          This request was declined
        </h1>
        <p className="mt-2 text-sm text-grey">
          Reach out to the artist directly if you have questions.
        </p>
      </Shell>
    );
  }

  if (submission.status === "RED_CONSULTATION_REQUIRED") {
    return (
      <Shell>
        <Badge tone="red">Consultation required</Badge>
        <h1 className="mt-3 font-display text-3xl leading-tight text-ink">
          This one needs a consultation
        </h1>
        <p className="mt-2 text-sm text-grey">
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
        <h1 className="font-display text-3xl leading-tight text-ink">
          Still under review
        </h1>
        <p className="mt-2 text-sm text-grey">
          The artist hasn't confirmed a price yet. Check back later, or wait
          for the email once it's ready.
        </p>
      </Shell>
    );
  }

  return (
    <Shell>
      <div className="flex items-center justify-between">
        <h1 className="font-display text-3xl leading-tight text-ink">Pick a time</h1>
        <Badge tone="green">Auto-bookable</Badge>
      </div>

      <Card className="mt-6">
        <p className="font-mono text-[11px] uppercase tracking-wide text-grey">Estimated price</p>
        <p className="mt-1 font-display text-2xl text-ink">
          ${submission.priceLow?.toFixed(0)}–${submission.priceHigh?.toFixed(0)}
        </p>
        {submission.hours != null && (
          <>
            <p className="mt-3 font-mono text-[11px] uppercase tracking-wide text-grey">
              Estimated time
            </p>
            <p className="mt-1 text-ink">{submission.hours.toFixed(1)} hours</p>
          </>
        )}
      </Card>

      <div className="mt-4">
        <SlotBooker submissionId={submission.id} type="TATTOO" onBooked={setBooked} />
      </div>

      <p className="mt-6 text-xs text-grey">
        This is an estimated price based on the information provided. Final
        pricing may vary based on the artist's assessment and the final
        design.
      </p>
    </Shell>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <main className="min-h-screen bg-paper text-ink">
      <div className="mx-auto flex min-h-screen max-w-md flex-col px-5 py-8">
        {children}
      </div>
    </main>
  );
}
