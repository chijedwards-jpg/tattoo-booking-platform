"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Calendar } from "lucide-react";
import { Card, Badge, PrimaryButton, GhostButton } from "../../../ui";
import { googleCalendarUrl } from "@/lib/googleCalendar";

export default function DepositStatus({
  appointmentId,
  type,
  startTime,
  endTime,
  depositPaid,
  depositAmount,
}: {
  appointmentId: string;
  type: "TATTOO" | "CONSULTATION";
  startTime: string;
  endTime: string;
  depositPaid: boolean;
  depositAmount: number | null;
}) {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function act(action: "MARK_DEPOSIT_RECEIVED" | "CANCEL") {
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

      {type === "TATTOO" && (
        <div className="mt-4 flex items-center gap-3">
          <Badge tone={depositPaid ? "green" : "yellow"}>
            {depositPaid ? "Deposit received" : "Deposit pending"}
          </Badge>
          {depositAmount != null && <span className="text-sm text-grey">${depositAmount.toFixed(0)}</span>}
        </div>
      )}

      <div className="mt-4 flex gap-3">
        {type === "TATTOO" && !depositPaid && (
          <PrimaryButton onClick={() => act("MARK_DEPOSIT_RECEIVED")} disabled={submitting}>
            Mark deposit received
          </PrimaryButton>
        )}
        <GhostButton onClick={() => act("CANCEL")} disabled={submitting}>
          Cancel appointment
        </GhostButton>
      </div>
      {error && <p className="mt-2 text-xs text-ink-red">{error}</p>}
    </Card>
  );
}
