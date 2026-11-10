"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Calendar } from "lucide-react";
import { Card, Badge, PrimaryButton, GhostButton } from "../../../ui";
import { googleCalendarUrl } from "@/lib/googleCalendar";
import { CONFIRMATION_META } from "@/lib/confirmationMeta";

export default function DepositStatus({
  appointmentId,
  type,
  startTime,
  endTime,
  depositPaid,
  depositAmount,
  confirmationStatus,
  confirmationNote,
  status,
  isPast,
}: {
  status: "SCHEDULED" | "COMPLETED" | "CANCELLED" | "NO_SHOW";
  isPast: boolean;
  appointmentId: string;
  type: "TATTOO" | "CONSULTATION";
  startTime: string;
  endTime: string;
  depositPaid: boolean;
  depositAmount: number | null;
  confirmationStatus: keyof typeof CONFIRMATION_META;
  confirmationNote: string | null;
}) {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function act(action: "MARK_DEPOSIT_RECEIVED" | "CANCEL" | "MARK_COMPLETED" | "MARK_NO_SHOW") {
    if (
      action === "CANCEL" &&
      !confirm("Cancel this appointment? The slot opens up again and the client is emailed a link to pick a new time.")
    ) {
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch(`/api/appointments/${appointmentId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error ?? "Couldn't update.");
      }
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setSubmitting(false);
    }
  }

  const calendarUrl = googleCalendarUrl({
    title: type === "TATTOO" ? "Tattoo appointment" : "Consultation",
    start: new Date(startTime),
    end: new Date(endTime),
  });

  return (
    <Card className="mt-8">
      <p className="font-mono text-[11px] uppercase tracking-wide text-grey">
        {type === "TATTOO" ? "Tattoo appointment" : "Consultation"}
      </p>
      <p className="mt-1 font-display text-lg text-ink">
        {new Date(startTime).toLocaleString(undefined, {
          weekday: "long",
          month: "long",
          day: "numeric",
          hour: "numeric",
          minute: "2-digit",
        })}
      </p>
      <a
        href={calendarUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="mt-1 inline-flex items-center gap-1.5 text-xs text-ink-red hover:underline"
      >
        <Calendar size={13} /> Add to Google Calendar
      </a>

      <div className="mt-4 flex flex-wrap gap-2">
        {status !== "SCHEDULED" ? (
          <Badge tone={status === "COMPLETED" ? "green" : "red"}>
            {status === "COMPLETED" ? "Completed" : status === "NO_SHOW" ? "No-show" : "Cancelled"}
          </Badge>
        ) : (
          <Badge tone={CONFIRMATION_META[confirmationStatus].tone}>
            {CONFIRMATION_META[confirmationStatus].label}
          </Badge>
        )}
      </div>
      {status === "SCHEDULED" && confirmationStatus === "RESCHEDULE_REQUESTED" && confirmationNote && (
        <p className="mt-2 text-sm text-ink">&ldquo;{confirmationNote}&rdquo;</p>
      )}

      {type === "TATTOO" && (
        <div className="mt-4 flex items-center gap-3">
          <Badge tone={depositPaid ? "green" : "yellow"}>
            {depositPaid ? "Deposit received" : "Deposit pending"}
          </Badge>
          {depositAmount != null && <span className="text-sm text-grey">${depositAmount.toFixed(0)}</span>}
        </div>
      )}

      <div className="mt-4 flex flex-wrap gap-3">
        {type === "TATTOO" && !depositPaid && status !== "CANCELLED" && (
          <PrimaryButton onClick={() => act("MARK_DEPOSIT_RECEIVED")} disabled={submitting}>
            Mark deposit received
          </PrimaryButton>
        )}
        {status === "SCHEDULED" && isPast && (
          <>
            <PrimaryButton onClick={() => act("MARK_COMPLETED")} disabled={submitting}>
              Mark completed
            </PrimaryButton>
            <GhostButton onClick={() => act("MARK_NO_SHOW")} disabled={submitting}>
              Mark no-show
            </GhostButton>
          </>
        )}
        {status === "SCHEDULED" && !isPast && (
          <GhostButton onClick={() => act("CANCEL")} disabled={submitting}>
            Cancel appointment
          </GhostButton>
        )}
      </div>
      {error && <p className="mt-2 text-xs text-ink-red">{error}</p>}
    </Card>
  );
}
