"use client";

import { useState } from "react";
import type { AvailabilityBlock, AvailabilityType } from "@prisma/client";

const DAY_LABELS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

const TYPE_LABEL: Record<AvailabilityType, string> = {
  TATTOO: "Tattoo appointments",
  CONSULTATION: "Consultations",
};

function inputClass() {
  return "rounded-sm border border-paper/10 bg-white/[0.02] px-3 py-2 text-sm text-paper outline-none focus:border-ink-red";
}

function sortBlocks(blocks: AvailabilityBlock[]) {
  return [...blocks].sort((a, b) => {
    if (a.type !== b.type) return a.type.localeCompare(b.type);
    if (a.dayOfWeek! !== b.dayOfWeek!) return a.dayOfWeek! - b.dayOfWeek!;
    return a.startTime.localeCompare(b.startTime);
  });
}

export function AvailabilityForm({ blocks }: { blocks: AvailabilityBlock[] }) {
  const [rows, setRows] = useState(sortBlocks(blocks));
  const [type, setType] = useState<AvailabilityType>("TATTOO");
  const [dayOfWeek, setDayOfWeek] = useState(1);
  const [startTime, setStartTime] = useState("10:00");
  const [endTime, setEndTime] = useState("18:00");
  const [adding, setAdding] = useState(false);
  const [addError, setAddError] = useState<string | null>(null);

  async function addBlock(e: React.FormEvent) {
    e.preventDefault();
    setAdding(true);
    setAddError(null);
    try {
      const res = await fetch("/api/settings/availability", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type, dayOfWeek, startTime, endTime }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error ?? "Couldn't add that window.");
      }
      const { block } = await res.json();
      setRows((r) => sortBlocks([...r, block]));
    } catch (err) {
      setAddError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setAdding(false);
    }
  }

  const tattooRows = rows.filter((b) => b.type === "TATTOO");
  const consultationRows = rows.filter((b) => b.type === "CONSULTATION");

  return (
    <div className="rounded-sm border border-paper/10 bg-white/[0.02] p-5">
      {(["TATTOO", "CONSULTATION"] as AvailabilityType[]).map((t) => {
        const group = t === "TATTOO" ? tattooRows : consultationRows;
        return (
          <div key={t} className="mb-5 last:mb-0">
            <p className="text-xs uppercase tracking-wide text-paper/40">{TYPE_LABEL[t]}</p>
            <div className="mt-2 flex flex-col gap-2">
              {group.length === 0 && (
                <p className="text-sm text-paper/40">No weekly hours set.</p>
              )}
              {group.map((block) => (
                <AvailabilityRow
                  key={block.id}
                  block={block}
                  onSaved={(updated) => setRows((r) => sortBlocks(r.map((b) => (b.id === updated.id ? updated : b))))}
                  onDeleted={(id) => setRows((r) => r.filter((b) => b.id !== id))}
                />
              ))}
            </div>
          </div>
        );
      })}

      <form onSubmit={addBlock} className="mt-4 flex flex-wrap items-end gap-2 border-t border-paper/10 pt-4">
        <div>
          <label className="text-xs text-paper/50">Type</label>
          <select
            value={type}
            onChange={(e) => setType(e.target.value as AvailabilityType)}
            className={`mt-1 ${inputClass()}`}
          >
            <option value="TATTOO">Tattoo</option>
            <option value="CONSULTATION">Consultation</option>
          </select>
        </div>

        <div>
          <label className="text-xs text-paper/50">Day</label>
          <select
            value={dayOfWeek}
            onChange={(e) => setDayOfWeek(Number(e.target.value))}
            className={`mt-1 ${inputClass()}`}
          >
            {DAY_LABELS.map((label, i) => (
              <option key={i} value={i}>
                {label}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="text-xs text-paper/50">Start</label>
          <input
            type="time"
            value={startTime}
            onChange={(e) => setStartTime(e.target.value)}
            className={`mt-1 ${inputClass()}`}
          />
        </div>

        <div>
          <label className="text-xs text-paper/50">End</label>
          <input
            type="time"
            value={endTime}
            onChange={(e) => setEndTime(e.target.value)}
            className={`mt-1 ${inputClass()}`}
          />
        </div>

        <button
          type="submit"
          disabled={adding}
          className="rounded-sm bg-ink-red px-4 py-2 text-sm font-medium text-paper disabled:opacity-40"
        >
          Add
        </button>
      </form>
      {addError && <p className="mt-2 text-xs text-ink-red">{addError}</p>}
    </div>
  );
}

function AvailabilityRow({
  block,
  onSaved,
  onDeleted,
}: {
  block: AvailabilityBlock;
  onSaved: (block: AvailabilityBlock) => void;
  onDeleted: (id: string) => void;
}) {
  const [startTime, setStartTime] = useState(block.startTime);
  const [endTime, setEndTime] = useState(block.endTime);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const dirty = startTime !== block.startTime || endTime !== block.endTime;

  async function save() {
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`/api/settings/availability/${block.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ startTime, endTime }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error ?? "Couldn't save.");
      }
      const { block: updated } = await res.json();
      onSaved(updated);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setSaving(false);
    }
  }

  async function remove() {
    setError(null);
    const res = await fetch(`/api/settings/availability/${block.id}`, { method: "DELETE" });
    if (!res.ok) {
      setError("Couldn't delete.");
      return;
    }
    onDeleted(block.id);
  }

  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center gap-2">
        <span className="w-24 text-sm text-paper/80">{DAY_LABELS[block.dayOfWeek ?? 0]}</span>
        <input
          type="time"
          value={startTime}
          onChange={(e) => setStartTime(e.target.value)}
          className={inputClass()}
        />
        <span className="text-paper/40">–</span>
        <input
          type="time"
          value={endTime}
          onChange={(e) => setEndTime(e.target.value)}
          className={inputClass()}
        />
        {dirty && (
          <button
            onClick={save}
            disabled={saving}
            className="rounded-sm border border-ink-red/60 px-3 py-2 text-xs text-paper disabled:opacity-40"
          >
            Save
          </button>
        )}
        <button onClick={remove} className="ml-auto text-xs text-paper/40 hover:text-ink-red">
          Remove
        </button>
      </div>
      {error && <p className="text-xs text-ink-red">{error}</p>}
    </div>
  );
}
