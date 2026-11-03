"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Check, CalendarClock, Ban } from "lucide-react";
import { Card, PrimaryButton, GhostButton, Field, inputClass } from "../../../ui";

export default function ReviewActions({
  submissionId,
  currentStatus,
  suggestedLow,
  suggestedHigh,
  suggestedHours,
  artistOverrideHours,
  artistOverridePriceLow,
  artistOverridePriceHigh,
  artistNotes,
}: {
  submissionId: string;
  currentStatus: string;
  suggestedLow: number;
  suggestedHigh: number;
  suggestedHours: number;
  artistOverrideHours: number | null;
  artistOverridePriceLow: number | null;
  artistOverridePriceHigh: number | null;
  artistNotes: string | null;
}) {
  const router = useRouter();
  const [overriding, setOverriding] = useState(false);
  const [low, setLow] = useState(artistOverridePriceLow ?? suggestedLow);
  const [high, setHigh] = useState(artistOverridePriceHigh ?? suggestedHigh);
  const [hours, setHours] = useState(artistOverrideHours ?? suggestedHours);
  const [notes, setNotes] = useState(artistNotes ?? "");
  const [submitting, setSubmitting] = useState(false);

  // Starts the price from the new time, since most artists price by the hour.
  // Both prices stay editable if this one should be different.
  function changeHours(next: number) {
    setHours(next);
    if (next > 0 && suggestedHours > 0) {
      setLow(Math.round((suggestedLow * next) / suggestedHours));
      setHigh(Math.round((suggestedHigh * next) / suggestedHours));
    }
  }

  async function updateStatus(status: string, overridePrice = false) {
    setSubmitting(true);
    try {
      await fetch(`/api/submissions/${submissionId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status,
          ...(overridePrice
            ? { artistOverridePriceLow: low, artistOverridePriceHigh: high, artistOverrideHours: hours, artistNotes: notes }
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
      <Card className="mt-6">
        <p className="text-sm text-grey">
          This submission has already been marked <strong className="text-ink">{currentStatus}</strong>.
        </p>
      </Card>
    );
  }

  return (
    <div className="mt-8 flex flex-col gap-4">
      {!overriding ? (
        <div className="flex gap-3">
          <PrimaryButton className="flex-1" disabled={submitting} onClick={() => updateStatus("APPROVED")}>
            <Check size={15} /> Approve estimate
          </PrimaryButton>
          <GhostButton className="flex-1" onClick={() => setOverriding(true)}>
            Edit estimate
          </GhostButton>
        </div>
      ) : (
        <Card>
          <div className="mb-3">
            <Field label="Hours">
              <input
                type="number"
                min={0.5}
                step={0.5}
                value={hours}
                onChange={(e) => changeHours(Number(e.target.value))}
                className={inputClass()}
              />
            </Field>
            <p className="mt-1 text-xs text-grey">
              This sets how long a slot the client books. Prices below update to match.
            </p>
          </div>
          <div className="flex gap-3">
            <Field label="Low ($)">
              <input
                type="number"
                value={low}
                onChange={(e) => setLow(Number(e.target.value))}
                className={inputClass()}
              />
            </Field>
            <Field label="High ($)">
              <input
                type="number"
                value={high}
                onChange={(e) => setHigh(Number(e.target.value))}
                className={inputClass()}
              />
            </Field>
          </div>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Notes to yourself (optional)"
            rows={2}
            className={`mt-3 ${inputClass()}`}
          />
          <PrimaryButton full className="mt-3" disabled={submitting || hours <= 0} onClick={() => updateStatus("APPROVED", true)}>
            <Check size={15} /> Save & approve
          </PrimaryButton>
        </Card>
      )}

      <div className="flex gap-3">
        <GhostButton
          className="flex-1 !py-2 text-xs"
          onClick={() => updateStatus("RED_CONSULTATION_REQUIRED")}
        >
          <CalendarClock size={14} /> Require consultation instead
        </GhostButton>
        <GhostButton className="flex-1 !py-2 text-xs" onClick={() => updateStatus("DECLINED")}>
          <Ban size={14} /> Decline
        </GhostButton>
      </div>
    </div>
  );
}
