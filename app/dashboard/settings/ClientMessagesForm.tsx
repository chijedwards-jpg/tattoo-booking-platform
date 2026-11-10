"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Chip, PrimaryButton } from "../../ui";
import { REMINDER_DAY_OPTIONS } from "@/lib/reminderOptions";

export function ClientMessagesForm({
  reminderDaysBefore,
  sendReviewRequests,
}: {
  reminderDaysBefore: number[];
  sendReviewRequests: boolean;
}) {
  const router = useRouter();
  const [days, setDays] = useState<number[]>(reminderDaysBefore);
  const [reviews, setReviews] = useState(sendReviewRequests);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function toggleDay(d: number) {
    setSaved(false);
    setDays((cur) => (cur.includes(d) ? cur.filter((x) => x !== d) : [...cur, d]));
  }

  async function save() {
    setSaving(true);
    setSaved(false);
    setError(null);
    try {
      const res = await fetch("/api/settings/client-messages", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reminderDaysBefore: days, sendReviewRequests: reviews }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error ?? "Couldn't save.");
      }
      setSaved(true);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="rounded-2xl border border-line bg-card p-5">
      <p className="text-sm font-medium text-ink">Appointment reminders</p>
      <p className="mt-0.5 text-sm text-grey">
        Clients get an email on each day you pick, with a button to confirm or ask to reschedule. Pick none to turn
        reminders off.
      </p>
      <div className="mt-3 flex flex-wrap gap-2">
        {REMINDER_DAY_OPTIONS.map((d) => (
          <Chip key={d} active={days.includes(d)} onClick={() => toggleDay(d)}>
            {d === 1 ? "1 day before" : `${d} days before`}
          </Chip>
        ))}
      </div>

      <label className="mt-6 flex cursor-pointer items-start gap-3">
        <input
          type="checkbox"
          checked={reviews}
          onChange={(e) => {
            setReviews(e.target.checked);
            setSaved(false);
          }}
          className="mt-1"
        />
        <span>
          <span className="block text-sm font-medium text-ink">Ask for a review after each tattoo</span>
          <span className="block text-sm text-grey">
            Sent by email once the appointment is over. You choose which reviews show on your booking page.
          </span>
        </span>
      </label>

      <div className="mt-5 flex items-center gap-3">
        <PrimaryButton onClick={save} disabled={saving}>
          {saving ? "Saving…" : "Save"}
        </PrimaryButton>
        {saved && <span className="text-sm text-pine">Saved</span>}
      </div>
      {error && <p className="mt-2 text-xs text-ink-red">{error}</p>}
    </div>
  );
}
