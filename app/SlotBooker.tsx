"use client";

import { useEffect, useState } from "react";

export interface Slot {
  start: string;
  end: string;
}

/**
 * Fetches open slots for a submission and lets the client book one.
 * Consultations (free) book immediately via /api/appointments and call
 * onBooked. Tattoo appointments require a deposit, so booking one instead
 * starts a Stripe Checkout session and navigates the client there — the
 * appointment itself isn't created until the deposit is actually paid, via
 * the checkout webhook, so onBooked never fires for this type.
 */
export function SlotBooker({
  submissionId,
  type,
  onBooked,
}: {
  submissionId: string;
  type: "TATTOO" | "CONSULTATION";
  onBooked?: (slot: Slot) => void;
}) {
  const [slots, setSlots] = useState<Slot[] | null>(null);
  const [booking, setBooking] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const typeParam = type === "CONSULTATION" ? "consultation" : "tattoo";
    fetch(`/api/availability?submissionId=${submissionId}&type=${typeParam}`)
      .then((res) => res.json())
      .then((data) => setSlots(data.slots ?? []))
      .catch(() => setError("Couldn't load available times."));
  }, [submissionId, type]);

  async function bookSlot(slot: Slot) {
    setBooking(slot.start);
    setError(null);
    try {
      if (type === "TATTOO") {
        const res = await fetch("/api/checkout", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ submissionId, startTime: slot.start }),
        });
        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          throw new Error(body.error ?? "Couldn't start checkout.");
        }
        const { url } = await res.json();
        if (!url) throw new Error("Couldn't start checkout.");
        window.location.href = url;
        return;
      }

      const res = await fetch("/api/appointments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ submissionId, startTime: slot.start }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error ?? "Couldn't book that time.");
      }
      onBooked?.(slot);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setBooking(null);
    }
  }

  return (
    <div>
      {error && (
        <p className="mb-4 rounded-sm border border-ink-red/40 bg-ink-red/10 px-4 py-3 text-sm text-paper">
          {error}
        </p>
      )}

      {slots === null && <p className="text-sm text-paper/50">Loading available times…</p>}

      {slots?.length === 0 && (
        <p className="text-sm text-paper/50">
          No openings found right now — the artist will follow up directly.
        </p>
      )}

      {slots && slots.length > 0 && (
        <div className="flex max-h-80 flex-col gap-2 overflow-y-auto">
          {slots.slice(0, 20).map((slot) => (
            <button
              key={slot.start}
              onClick={() => bookSlot(slot)}
              disabled={booking !== null}
              className="rounded-sm border border-paper/10 bg-white/[0.02] px-4 py-3 text-left text-sm text-paper transition-colors hover:border-ink-red/60 disabled:opacity-40"
            >
              {booking === slot.start
                ? type === "TATTOO"
                  ? "Redirecting to checkout…"
                  : "Booking…"
                : new Date(slot.start).toLocaleString(undefined, {
                    weekday: "short",
                    month: "short",
                    day: "numeric",
                    hour: "numeric",
                    minute: "2-digit",
                  })}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export function BookedConfirmation({ slot }: { slot: Slot }) {
  return (
    <div className="flex flex-col gap-4">
      <h1 className="font-display text-3xl leading-tight text-paper">You're booked</h1>
      <p className="text-sm text-paper/70">
        {new Date(slot.start).toLocaleString(undefined, {
          weekday: "long",
          month: "long",
          day: "numeric",
          hour: "numeric",
          minute: "2-digit",
        })}
      </p>
    </div>
  );
}
