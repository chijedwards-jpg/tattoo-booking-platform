"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function ReviewActions({
  submissionId,
  currentStatus,
  suggestedLow,
  suggestedHigh,
  artistOverridePriceLow,
  artistOverridePriceHigh,
  artistNotes,
}: {
  submissionId: string;
  currentStatus: string;
  suggestedLow: number;
  suggestedHigh: number;
  artistOverridePriceLow: number | null;
  artistOverridePriceHigh: number | null;
  artistNotes: string | null;
}) {
  const router = useRouter();
  const [overriding, setOverriding] = useState(false);
  const [low, setLow] = useState(artistOverridePriceLow ?? suggestedLow);
  const [high, setHigh] = useState(artistOverridePriceHigh ?? suggestedHigh);
  const [notes, setNotes] = useState(artistNotes ?? "");
  const [submitting, setSubmitting] = useState(false);

  async function updateStatus(status: string, overridePrice = false) {
    setSubmitting(true);
    try {
      await fetch(`/api/submissions/${submissionId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status,
          ...(overridePrice
            ? { artistOverridePriceLow: low, artistOverridePriceHigh: high, artistNotes: notes }
            : {}),
        }),
      });
      router.refresh();
    } finally {
      setSubmitting(false);
    }
  }

  const alreadyDecided = ["APPROVED", "DECLINED", "BOOKED"].includes(currentStatus);

  if (alreadyDecided) {
    return (
      <p className="mt-6 rounded-sm border border-paper/10 bg-white/[0.02] p-4 text-sm text-paper/60">
        This submission has already been marked <strong className="text-paper">{currentStatus}</strong>.
      </p>
    );
  }

  return (
    <div className="mt-8 flex flex-col gap-4">
      {!overriding ? (
        <div className="flex gap-3">
          <button
            disabled={submitting}
            onClick={() => updateStatus("APPROVED")}
            className="flex-1 rounded-sm bg-ink-red py-3 text-sm font-medium text-paper disabled:opacity-40"
          >
            Approve estimate
          </button>
          <button
            onClick={() => setOverriding(true)}
            className="flex-1 rounded-sm border border-paper/20 py-3 text-sm text-paper/80"
          >
            Edit estimate
          </button>
        </div>
      ) : (
        <div className="rounded-sm border border-paper/10 bg-white/[0.02] p-4">
          <div className="flex gap-3">
            <div className="flex-1">
              <label className="text-xs text-paper/50">Low ($)</label>
              <input
                type="number"
                value={low}
                onChange={(e) => setLow(Number(e.target.value))}
                className="mt-1 w-full rounded-sm border border-paper/10 bg-white/[0.02] px-3 py-2 text-paper outline-none focus:border-ink-red"
              />
            </div>
            <div className="flex-1">
              <label className="text-xs text-paper/50">High ($)</label>
              <input
                type="number"
                value={high}
                onChange={(e) => setHigh(Number(e.target.value))}
                className="mt-1 w-full rounded-sm border border-paper/10 bg-white/[0.02] px-3 py-2 text-paper outline-none focus:border-ink-red"
              />
            </div>
          </div>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Notes to yourself (optional)"
            rows={2}
            className="mt-3 w-full rounded-sm border border-paper/10 bg-white/[0.02] px-3 py-2 text-sm text-paper outline-none placeholder:text-paper/30 focus:border-ink-red"
          />
          <button
            disabled={submitting}
            onClick={() => updateStatus("APPROVED", true)}
            className="mt-3 w-full rounded-sm bg-ink-red py-3 text-sm font-medium text-paper disabled:opacity-40"
          >
            Save & approve
          </button>
        </div>
      )}

      <div className="flex gap-3">
        <button
          disabled={submitting}
          onClick={() => updateStatus("RED_CONSULTATION_REQUIRED")}
          className="flex-1 rounded-sm border border-paper/15 py-2.5 text-xs text-paper/60"
        >
          Require consultation instead
        </button>
        <button
          disabled={submitting}
          onClick={() => updateStatus("DECLINED")}
          className="flex-1 rounded-sm border border-paper/15 py-2.5 text-xs text-paper/60"
        >
          Decline
        </button>
      </div>
    </div>
  );
}
