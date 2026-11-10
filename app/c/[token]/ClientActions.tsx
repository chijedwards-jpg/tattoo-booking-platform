"use client";

import { useState } from "react";
import { Star } from "lucide-react";
import { Badge, GhostButton, PrimaryButton } from "../../ui";

type ConfirmationStatus = "PENDING" | "CONFIRMED" | "RESCHEDULE_REQUESTED";

async function post(url: string, body: unknown) {
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error ?? "Something went wrong. Please try again.");
  }
}

export function ConfirmActions({
  token,
  artistName,
  initialStatus,
}: {
  token: string;
  artistName: string;
  initialStatus: ConfirmationStatus;
}) {
  const [status, setStatus] = useState<ConfirmationStatus>(initialStatus);
  const [askingToReschedule, setAskingToReschedule] = useState(false);
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function act(action: "CONFIRM" | "RESCHEDULE") {
    setBusy(true);
    setError(null);
    try {
      await post(`/api/public/appointments/${token}`, { action, note: action === "RESCHEDULE" ? note : undefined });
      setStatus(action === "CONFIRM" ? "CONFIRMED" : "RESCHEDULE_REQUESTED");
      setAskingToReschedule(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setBusy(false);
    }
  }

  if (status === "RESCHEDULE_REQUESTED") {
    return (
      <div>
        <Badge tone="yellow">Reschedule requested</Badge>
        <p className="mt-3 text-sm text-ink">
          {artistName} has been told you need a new time and will reach out to you.
        </p>
        <button
          onClick={() => act("CONFIRM")}
          disabled={busy}
          className="mt-4 text-sm text-grey underline hover:text-ink disabled:opacity-40"
        >
          Never mind, I can make this time
        </button>
        {error && <p className="mt-3 text-sm text-ink-red">{error}</p>}
      </div>
    );
  }

  return (
    <div>
      {status === "CONFIRMED" ? (
        <>
          <Badge tone="green">Confirmed</Badge>
          <p className="mt-3 text-sm text-ink">You're confirmed. See you then!</p>
        </>
      ) : (
        <PrimaryButton full onClick={() => act("CONFIRM")} disabled={busy}>
          Confirm I'll be there
        </PrimaryButton>
      )}

      {askingToReschedule ? (
        <div className="mt-6">
          <label className="text-sm text-ink" htmlFor="note">
            Anything {artistName} should know? (optional)
          </label>
          <textarea
            id="note"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            maxLength={500}
            rows={3}
            placeholder="e.g. I'm free any weekday after 3pm"
            className="mt-2 w-full rounded-xl border border-line bg-card p-3 text-sm text-ink"
          />
          <div className="mt-3 flex gap-3">
            <PrimaryButton onClick={() => act("RESCHEDULE")} disabled={busy}>
              Ask to reschedule
            </PrimaryButton>
            <GhostButton onClick={() => setAskingToReschedule(false)} disabled={busy}>
              Never mind
            </GhostButton>
          </div>
        </div>
      ) : (
        <button
          onClick={() => setAskingToReschedule(true)}
          className="mt-4 text-sm text-grey underline hover:text-ink"
        >
          I can't make it, I need to reschedule
        </button>
      )}
      {error && <p className="mt-3 text-sm text-ink-red">{error}</p>}
    </div>
  );
}

export function ReviewForm({ token, artistName }: { token: string; artistName: string }) {
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState("");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    setBusy(true);
    setError(null);
    try {
      await post(`/api/public/appointments/${token}/review`, { rating, comment });
      setDone(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setBusy(false);
    }
  }

  if (done) {
    return <p className="text-sm text-ink">Thanks for your review. {artistName} appreciates it!</p>;
  }

  return (
    <div>
      <p className="text-sm text-ink">How was your tattoo with {artistName}?</p>
      <div className="mt-3 flex gap-1" role="radiogroup" aria-label="Rating">
        {[1, 2, 3, 4, 5].map((n) => (
          <button
            key={n}
            type="button"
            role="radio"
            aria-checked={rating === n}
            aria-label={`${n} star${n > 1 ? "s" : ""}`}
            onClick={() => setRating(n)}
            className="p-1"
          >
            <Star size={30} className={n <= rating ? "fill-ochre text-ochre" : "text-line"} />
          </button>
        ))}
      </div>
      <textarea
        value={comment}
        onChange={(e) => setComment(e.target.value)}
        maxLength={1000}
        rows={4}
        placeholder="Tell others about your experience (optional)"
        className="mt-4 w-full rounded-xl border border-line bg-card p-3 text-sm text-ink"
      />
      <PrimaryButton full className="mt-4" onClick={submit} disabled={busy || rating === 0}>
        Send review
      </PrimaryButton>
      {error && <p className="mt-3 text-sm text-ink-red">{error}</p>}
    </div>
  );
}
