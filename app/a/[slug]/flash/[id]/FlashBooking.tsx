"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Calendar, ChevronLeft, Clock, MapPin } from "lucide-react";
import { BookedConfirmation, type Slot } from "../../../../SlotBooker";
import { Chip, inputClass } from "../../../../ui";
import { PLACEMENTS, type Placement } from "@/lib/placements";
import { formatFlashDuration } from "@/lib/flash";

export function FlashBooking({
  artistSlug,
  artistName,
  design,
  available,
}: {
  artistSlug: string;
  artistName: string;
  design: { id: string; name: string; price: number; durationMins: number; oneOff: boolean };
  available: boolean;
}) {
  const [slots, setSlots] = useState<Slot[] | null>(null);
  const [timeZone, setTimeZone] = useState<string | undefined>(undefined);
  const [placement, setPlacement] = useState<Placement | null>(null);
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [booking, setBooking] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [booked, setBooked] = useState<{
    slot: Slot;
    deposit: { amount: number; instructions: string | null };
  } | null>(null);

  function loadSlots() {
    return fetch(`/api/public/flash/${design.id}/availability`)
      .then((res) => res.json())
      .then((data) => {
        setTimeZone(data.timeZone);
        setSlots(data.slots ?? []);
      })
      .catch(() => setError("Couldn't load available times."));
  }

  useEffect(() => {
    if (available) loadSlots();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [design.id, available]);

  async function book(slot: Slot) {
    setBooking(slot.start);
    setError(null);
    try {
      const res = await fetch(`/api/public/flash/${design.id}/book`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ clientEmail: email.trim(), clientName: name.trim(), placement, startTime: slot.start }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        // Whatever was on screen is out of date, so show what's open now.
        loadSlots();
        throw new Error(body.error ?? "Couldn't book that time.");
      }
      setBooked({ slot: body.slot, deposit: body.deposit });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setBooking(null);
    }
  }

  const ready = placement && name.trim().length > 0 && /^\S+@\S+\.\S+$/.test(email.trim());

  return (
    <main className="min-h-screen bg-paper text-ink">
      <div className="mx-auto flex max-w-md flex-col gap-6 px-5 py-8">
        {booked ? (
          <BookedConfirmation
            slot={booked.slot}
            title={`Flash tattoo with ${artistName}`}
            depositAmount={booked.deposit.amount}
            depositInstructions={booked.deposit.instructions}
          />
        ) : (
          <>
            <Link href={`/a/${artistSlug}/flash`} className="flex items-center gap-1 text-sm text-grey hover:text-ink">
              <ChevronLeft size={15} /> All flash
            </Link>

            <div>
              <img
                src={`/api/public/flash/${design.id}/image`}
                alt={design.name}
                className="w-full rounded-2xl border border-line object-contain"
              />
              <h1 className="mt-4 font-display text-3xl leading-tight text-ink">{design.name}</h1>
              <p className="mt-1 text-sm text-grey">
                ${design.price.toFixed(0)} · {formatFlashDuration(design.durationMins)}
                {design.oneOff && " \u00b7 One of a kind"}
              </p>
            </div>

            {!available ? (
              <p className="rounded-xl border border-line bg-card px-4 py-3 text-sm text-grey">
                This design isn't available anymore.
              </p>
            ) : (
              <>
                <div>
                  <p className="font-mono text-xs uppercase tracking-wide text-grey">Where do you want it?</p>
                  <div className="mt-2 grid grid-cols-2 gap-2">
                    {PLACEMENTS.map((p) => (
                      <Chip key={p.value} active={placement === p.value} onClick={() => setPlacement(p.value)}>
                        <MapPin size={13} className="-mt-0.5 mr-1.5 inline" />
                        {p.label}
                      </Chip>
                    ))}
                  </div>
                </div>

                <div>
                  <label htmlFor="flash-name" className="font-mono text-xs uppercase tracking-wide text-grey">
                    Your name
                  </label>
                  <input
                    id="flash-name"
                    type="text"
                    autoComplete="name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    maxLength={100}
                    placeholder="Your name"
                    className={`mt-1 ${inputClass()}`}
                  />
                </div>

                <div>
                  <label className="font-mono text-xs uppercase tracking-wide text-grey">Your email</label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@email.com"
                    className={`mt-1 ${inputClass()}`}
                  />
                </div>

                <div>
                  <p className="font-mono text-xs uppercase tracking-wide text-grey">Pick a time to book</p>
                  {!ready && (
                    <p className="mt-2 text-sm text-grey">Choose a placement and enter your name and email first.</p>
                  )}
                  {error && (
                    <p className="mt-2 rounded-xl border border-ink-red/40 bg-ink-red/10 px-4 py-3 text-sm text-ink">
                      {error}
                    </p>
                  )}
                  {slots === null && <p className="mt-2 text-sm text-grey">Loading available times…</p>}
                  {slots?.length === 0 && (
                    <p className="mt-2 text-sm text-grey">No openings right now. Please check back soon.</p>
                  )}
                  {slots && slots.length > 0 && (
                    <div className="mt-2 flex max-h-80 flex-col gap-2 overflow-y-auto">
                      {slots.slice(0, 20).map((slot) => (
                        <button
                          key={slot.start}
                          onClick={() => book(slot)}
                          disabled={!ready || booking !== null}
                          className="flex items-center justify-between rounded-xl border border-line bg-card px-4 py-3 text-left text-sm text-ink transition-colors hover:border-ink-red/50 disabled:opacity-40"
                        >
                          {booking === slot.start ? (
                            "Booking\u2026"
                          ) : (
                            <>
                              <span className="flex items-center gap-2">
                                <Calendar size={14} className="text-grey" />
                                {new Date(slot.start).toLocaleDateString(undefined, {
                                  timeZone,
                                  weekday: "short",
                                  month: "short",
                                  day: "numeric",
                                })}
                              </span>
                              <span className="flex items-center gap-2 text-grey">
                                <Clock size={14} />
                                {new Date(slot.start).toLocaleTimeString(undefined, {
                                  timeZone,
                                  timeZoneName: "short",
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
              </>
            )}
          </>
        )}
      </div>
    </main>
  );
}
