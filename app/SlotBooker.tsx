"use client";

import { useEffect, useState } from "react";

export interface Slot {
  start: string;
  end: string;
}

/**
 * Fetches open slots for a submission and lets the client book one.
 * Booking doesn't process payment — it just reserves the slot immediately
 * via /api/appointments. For tattoo appointments the deposit is paid
 * directly to the artist afterward (see BookedConfirmation) and the artist
 * marks it received from the dashboard.
 */
export function SlotBooker({
  submissionId,
  type,
  onBooked,
}: {
  submissionId: string;
  type: "TATTOO" | "CONSULTATION";
  onBooked: (slot: Slot) => void;
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
      const res = await fetch("/api/appointments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ submissionId, startTime: slot.start, type }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error ?? "Couldn't book that time.");
      }
      onBooked(slot);
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
                ? "Booking…"
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

export function BookedConfirmation({
  slot,
  depositAmount,
  depositInstructions,
}: {
  slot: Slot;
  depositAmount?: number | null;
  depositInstructions?: string | null;
}) {
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

      {depositAmount != null && depositAmount > 0 && (
        <div className="rounded-sm border border-paper/10 bg-white/[0.02] p-4">
          <p className="text-xs uppercase tracking-wide text-paper/40">Deposit due</p>
          <p className="mt-1 text-xl text-paper">${depositAmount.toFixed(0)}</p>
          <p className="mt-2 text-sm text-paper/70">
            {depositInstructions || "Your artist will follow up with payment details."}
          </p>
          <p className="mt-3 text-xs text-paper/40">
            Your slot is held, but not confirmed until the artist marks your
            deposit as received.
          </p>
        </div>
      )}
    </div>
  );
}
