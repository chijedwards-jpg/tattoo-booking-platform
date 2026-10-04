"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Link2, Unlink } from "lucide-react";
import { Card, Field, PrimaryButton, GhostButton, inputClass } from "../../ui";

export default function GoogleCalendarConnect({
  connectedId,
}: {
  connectedId: string | null;
}) {
  const router = useRouter();
  const [input, setInput] = useState("");
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function save(value: string | null) {
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/settings/calendar", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ input: value }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error ?? "Couldn't save.");
      }
      setInput("");
      setOpen(false);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setSaving(false);
    }
  }

  if (connectedId) {
    return (
      <div className="mt-4 flex flex-wrap items-center gap-3">
        <span className="text-sm text-grey">
          Showing <span className="text-ink">{connectedId}</span>
        </span>
        <GhostButton onClick={() => save(null)} disabled={saving} className="!py-1.5 text-xs">
          <Unlink size={13} /> Disconnect
        </GhostButton>
        {error && <span className="text-xs text-ink-red">{error}</span>}
      </div>
    );
  }

  if (!open) {
    return (
      <div className="mt-4">
        <GhostButton onClick={() => setOpen(true)} className="!py-2 text-sm">
          <Link2 size={14} /> Link your Google Calendar
        </GhostButton>
      </div>
    );
  }

  return (
    <Card className="mt-4">
      <Field
        label="Google Calendar"
        hint="In Google Calendar: Settings → your calendar → Integrate calendar. Paste the Calendar ID, public URL, or embed code. The calendar must be shared publicly for it to display here."
      >
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="you@gmail.com"
          className={inputClass()}
        />
      </Field>
      <div className="mt-4 flex items-center gap-3">
        <PrimaryButton onClick={() => save(input)} disabled={saving || !input.trim()}>
          {saving ? "Linking…" : "Link calendar"}
        </PrimaryButton>
        <GhostButton
          onClick={() => {
            setOpen(false);
            setError(null);
          }}
        >
          Cancel
        </GhostButton>
        {error && <span className="text-xs text-ink-red">{error}</span>}
      </div>
    </Card>
  );
}
