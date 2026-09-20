"use client";

import { useEffect, useState } from "react";
import { Calendar, Clock, CheckCircle2 } from "lucide-react";
import { Card } from "./ui";
import { googleCalendarUrl } from "@/lib/googleCalendar";

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
        <p className="mb-4 rounded-xl border border-ink-red/40 bg-ink-red/10 px-4 py-3 text-sm text-ink">
          {error}
        </p>
      )}

      {slots === null && <p className="text-sm text-grey">Loading available times…</p>}

      {slots?.length === 0 && (
        <p className="text-sm text-grey">
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
              className="flex items-center justify-between rounded-xl border border-line bg-card px-4 py-3 text-left text-sm text-ink transition-colors hover:border-ink-red/50 disabled:opacity-40"
            >
              {booking === slot.start ? (
                "Booking…"
              ) : (
                <>
                  <span className="flex items-center gap-2">
                    <Calendar size={14} className="text-grey" />
                    {new Date(slot.start).toLocaleDateString(undefined, {
                      weekday: "short",
                      month: "short",
                      day: "numeric",
                    })}
                  </span>
                  <span className="flex items-center gap-2 text-grey">
                    <Clock size={14} />
                    {new Date(slot.start).toLocaleTimeString(undefined, {
                      hour: "numeric",
                      minute: "2-digit",
                    })}
                  </span>
                </>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export function BookedConfirmation({
  slot,
  title,
  depositAmount,
  depositInstructions,
}: {
  slot: Slot;
  title?: string;
  depositAmount?: number | null;
  depositInstructions?: string | null;
}) {
  const start = new Date(slot.start);
  const end = new Date(slot.end);
  const calendarUrl = googleCalendarUrl({
    title: title ?? "Tattoo appointment",
    start,
    end,
  });

  return (
    <div className="flex flex-col gap-4 text-center">
      <CheckCircle2 size={30} className="mx-auto text-pine" />
      <div>
        <h1 className="font-display text-2xl leading-tight text-ink">You're booked</h1>
        <p className="mt-1 text-sm text-grey">
          {start.toLocaleString(undefined, {
            weekday: "long",
            month: "long",
            day: "numeric",
            hour: "numeric",
            minute: "2-digit",
          })}
        </p>
      </div>

      <a
        href={calendarUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="mx-auto inline-flex items-center gap-1.5 text-sm text-ink-red hover:underline"
      >
        <Calendar size={14} /> Add to Google Calendar
      </a>

      {depositAmount != null && depositAmount > 0 && (
        <Card className="text-left">
          <p className="font-mono text-[11px] uppercase tracking-wide text-grey">Deposit due</p>
          <p className="mt-1 font-display text-2xl text-ink">${depositAmount.toFixed(0)}</p>
          <p className="mt-2 text-sm text-ink">
            {depositInstructions || "Your artist will follow up with payment details."}
          </p>
          <p className="mt-3 text-xs text-grey">
            Your slot is held, but not confirmed until the artist marks your
            deposit as received.
          </p>
        </Card>
      )}
    </div>
  );
}
