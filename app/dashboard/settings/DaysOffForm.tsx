"use client";

import { useState } from "react";
import { Trash2 } from "lucide-react";
import { Card, Field, PrimaryButton, inputClass } from "../../ui";

type DayOff = { id: string; date: string }; // date: "YYYY-MM-DD"

function label(date: string) {
  // Read as a calendar day — no time zone shift.
  return new Date(`${date}T12:00:00Z`).toLocaleDateString("en-US", {
    timeZone: "UTC",
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function DaysOffForm({ initial, today }: { initial: DayOff[]; today: string }) {
  const [daysOff, setDaysOff] = useState(initial);
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function add(e: React.FormEvent) {
    e.preventDefault();
    if (!from) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/settings/days-off", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ from, to: to || undefined }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body.error ?? "Couldn't add those days.");
      setDaysOff((body.daysOff as DayOff[]).filter((d) => d.date >= today));
      setFrom("");
      setTo("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setBusy(false);
    }
  }

  async function remove(id: string) {
    setError(null);
    const res = await fetch(`/api/settings/availability/${id}`, { method: "DELETE" });
    if (res.ok) setDaysOff((d) => d.filter((x) => x.id !== id));
    else setError("Couldn't remove that day.");
  }

  return (
    <Card>
      <p className="text-sm text-grey">
        Clients can't book on these days, even inside your weekly hours. Bookings you already have aren't changed.
      </p>

      {daysOff.length > 0 && (
        <ul className="mt-4 flex flex-col gap-1.5">
          {daysOff.map((d) => (
            <li key={d.id} className="flex items-center justify-between rounded-lg bg-paper px-3 py-2 text-sm text-ink">
              {label(d.date)}
              <button onClick={() => remove(d.id)} aria-label={`Remove ${label(d.date)}`} className="text-grey hover:text-ink-red">
                <Trash2 size={14} />
              </button>
            </li>
          ))}
        </ul>
      )}

      <form onSubmit={add} className="mt-4 flex flex-wrap items-end gap-3">
        <Field label="First day off">
          <input type="date" min={today} value={from} onChange={(e) => setFrom(e.target.value)} className={inputClass()} />
        </Field>
        <Field label="Last day (optional)">
          <input type="date" min={from || today} value={to} onChange={(e) => setTo(e.target.value)} className={inputClass()} />
        </Field>
        <PrimaryButton type="submit" disabled={busy || !from}>
          {busy ? "Adding…" : "Add days off"}
        </PrimaryButton>
      </form>
      {error && <p className="mt-2 text-xs text-ink-red">{error}</p>}
    </Card>
  );
}
