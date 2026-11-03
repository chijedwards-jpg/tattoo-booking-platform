"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";
import { Badge, Card, Chip, Field, GhostButton, PrimaryButton, inputClass } from "../../ui";
import { fileToUploadDataUrl } from "@/lib/files";
import { formatFlashDuration } from "@/lib/flash";

// A gallery shows many of these at once, so they can be smaller than a reference photo.
const MAX_FLASH_IMAGE_LENGTH = 1024 * 1024;

interface FlashDesignRow {
  id: string;
  name: string;
  price: number;
  durationMins: number;
  oneOff: boolean;
  active: boolean;
  claimedAt: string | null;
}

export function FlashManager({ designs }: { designs: FlashDesignRow[] }) {
  const router = useRouter();
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [price, setPrice] = useState("");
  const [hours, setHours] = useState("");
  const [oneOff, setOneOff] = useState(false);
  const [saving, setSaving] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const selected = e.target.files?.[0];
    e.target.value = "";
    if (!selected) return;
    setFile(selected);
    setPreview(URL.createObjectURL(selected));
  }

  async function addDesign() {
    if (!file) return;
    setSaving(true);
    setError(null);
    try {
      const imageDataUrl = await fileToUploadDataUrl(file, MAX_FLASH_IMAGE_LENGTH);
      const res = await fetch("/api/flash", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          imageDataUrl,
          price: Number(price),
          durationMins: Math.round(Number(hours) * 60),
          oneOff,
        }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error ?? "Couldn't save that design.");
      }
      setFile(null);
      setPreview(null);
      setName("");
      setPrice("");
      setHours("");
      setOneOff(false);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setSaving(false);
    }
  }

  async function act(id: string, request: RequestInit) {
    setBusyId(id);
    setError(null);
    try {
      const res = await fetch(`/api/flash/${id}`, request);
      if (!res.ok) throw new Error("Couldn't update that design.");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setBusyId(null);
    }
  }

  function update(id: string, body: object) {
    return act(id, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
  }

  const canSave = file && name.trim() && Number(price) > 0 && Number(hours) > 0 && !saving;

  return (
    <div className="flex flex-col gap-6">
      <Card>
        <p className="font-mono text-[11px] uppercase tracking-wide text-grey">Add a design</p>
        <div className="mt-3 flex flex-col gap-3">
          <label className="flex aspect-video cursor-pointer items-center justify-center overflow-hidden rounded-xl border-2 border-dashed border-line bg-paper text-sm text-grey hover:border-ink-red/60">
            {preview ? (
              <img src={preview} alt="Design preview" className="h-full w-full object-contain" />
            ) : (
              "Tap to upload the design"
            )}
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp,image/heic"
              className="hidden"
              onChange={handleFile}
            />
          </label>

          <Field label="Name">
            <input value={name} onChange={(e) => setName(e.target.value)} maxLength={80} className={inputClass()} />
          </Field>

          <div className="flex gap-3">
            <div className="flex-1">
              <Field label="Price ($)">
                <input
                  type="number"
                  min={1}
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                  className={inputClass()}
                />
              </Field>
            </div>
            <div className="flex-1">
              <Field label="Hours">
                <input
                  type="number"
                  min={0.5}
                  step={0.5}
                  value={hours}
                  onChange={(e) => setHours(e.target.value)}
                  className={inputClass()}
                />
              </Field>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <Chip active={!oneOff} onClick={() => setOneOff(false)}>Repeatable</Chip>
            <Chip active={oneOff} onClick={() => setOneOff(true)}>One of a kind</Chip>
          </div>
          <p className="-mt-1 text-xs text-grey">
            {oneOff
              ? "Comes off your flash page as soon as someone books it."
              : "Stays on your flash page so more clients can book it."}
          </p>

          <PrimaryButton full disabled={!canSave} onClick={addDesign}>
            {saving ? "Saving\u2026" : "Add to flash page"}
          </PrimaryButton>
        </div>
      </Card>

      {error && (
        <p className="rounded-xl border border-ink-red/40 bg-ink-red/10 px-4 py-3 text-sm text-ink">{error}</p>
      )}

      {designs.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-line bg-card p-8 text-center text-sm text-grey">
          No flash yet. Designs you add show up here.
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {designs.map((d) => {
            const claimed = d.oneOff && d.claimedAt;
            return (
              <div key={d.id} className="flex items-center gap-4 rounded-xl border border-line bg-card p-3">
                <img
                  src={`/api/public/flash/${d.id}/image`}
                  alt={d.name}
                  className="h-16 w-16 flex-shrink-0 rounded-lg object-cover"
                />
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="truncate text-sm font-medium text-ink">{d.name}</span>
                    {claimed ? (
                      <Badge tone="neutral">Booked</Badge>
                    ) : d.active ? (
                      <Badge tone="green">On your page</Badge>
                    ) : (
                      <Badge tone="neutral">Hidden</Badge>
                    )}
                  </div>
                  <p className="mt-1 text-xs text-grey">
                    ${d.price.toFixed(0)} \u00b7 {formatFlashDuration(d.durationMins)} \u00b7{" "}
                    {d.oneOff ? "One of a kind" : "Repeatable"}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  {claimed ? (
                    <GhostButton
                      className="!px-3 !py-1.5 text-xs"
                      disabled={busyId === d.id}
                      onClick={() => update(d.id, { relist: true })}
                    >
                      Put back up
                    </GhostButton>
                  ) : (
                    <GhostButton
                      className="!px-3 !py-1.5 text-xs"
                      disabled={busyId === d.id}
                      onClick={() => update(d.id, { active: !d.active })}
                    >
                      {d.active ? "Hide" : "Show"}
                    </GhostButton>
                  )}
                  <button
                    type="button"
                    aria-label={`Delete ${d.name}`}
                    disabled={busyId === d.id}
                    onClick={() => {
                      if (window.confirm(`Delete "${d.name}"? Past bookings stay in your dashboard.`)) {
                        act(d.id, { method: "DELETE" });
                      }
                    }}
                    className="p-1.5 text-grey hover:text-ink-red disabled:opacity-40"
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
