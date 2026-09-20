"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function DepositStatus({
  appointmentId,
  type,
  startTime,
  depositPaid,
  depositAmount,
}: {
  appointmentId: string;
  type: "TATTOO" | "CONSULTATION";
  startTime: string;
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

  return (
    <div className="mt-8 rounded-sm border border-paper/10 bg-white/[0.02] p-5">
      <p className="text-xs uppercase tracking-wide text-paper/40">
        {type === "TATTOO" ? "Tattoo appointment" : "Consultation"}
      </p>
      <p className="mt-1 text-lg text-paper">
        {new Date(startTime).toLocaleString(undefined, {
          weekday: "long",
          month: "long",
          day: "numeric",
          hour: "numeric",
          minute: "2-digit",
        })}
      </p>

      {type === "TATTOO" && (
        <div className="mt-4 flex items-center gap-3">
          <span
            className={`rounded-full px-2 py-0.5 text-xs font-medium ${
              depositPaid ? "bg-green-900/40 text-green-300" : "bg-yellow-900/40 text-yellow-300"
            }`}
          >
            {depositPaid ? "Deposit received" : "Deposit pending"}
          </span>
          {depositAmount != null && (
            <span className="text-sm text-paper/60">${depositAmount.toFixed(0)}</span>
          )}
        </div>
      )}

      <div className="mt-4 flex gap-3">
        {type === "TATTOO" && !depositPaid && (
          <button
            onClick={() => act("MARK_DEPOSIT_RECEIVED")}
            disabled={submitting}
            className="rounded-sm bg-ink-red px-4 py-2 text-sm font-medium text-paper disabled:opacity-40"
          >
            Mark deposit received
          </button>
        )}
        <button
          onClick={() => act("CANCEL")}
          disabled={submitting}
          className="rounded-sm border border-paper/15 px-4 py-2 text-sm text-paper/70 disabled:opacity-40"
        >
          Cancel appointment
        </button>
      </div>
      {error && <p className="mt-2 text-xs text-ink-red">{error}</p>}
    </div>
  );
}
