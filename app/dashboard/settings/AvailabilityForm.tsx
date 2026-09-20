"use client";

import { useState } from "react";
import { Trash2 } from "lucide-react";
import type { AvailabilityBlock, AvailabilityType } from "@prisma/client";
import { Card, Field, PrimaryButton, inputClass } from "../../ui";

const DAY_LABELS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

const TYPE_LABEL: Record<AvailabilityType, string> = {
  TATTOO: "Tattoo appointments",
  CONSULTATION: "Consultations",
};

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
    <Card>
      {(["TATTOO", "CONSULTATION"] as AvailabilityType[]).map((t) => {
        const group = t === "TATTOO" ? tattooRows : consultationRows;
        return (
          <div key={t} className="mb-5 last:mb-0">
            <p className="font-mono text-[11px] uppercase tracking-wide text-grey">{TYPE_LABEL[t]}</p>
            <div className="mt-2 flex flex-col gap-2">
              {group.length === 0 && <p className="text-sm text-grey">No weekly hours set.</p>}
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

      <form onSubmit={addBlock} className="mt-4 flex flex-wrap items-end gap-2 border-t border-line pt-4">
        <div>
          <Field label="Type">
            <select
              value={type}
              onChange={(e) => setType(e.target.value as AvailabilityType)}
              className={inputClass()}
            >
              <option value="TATTOO">Tattoo</option>
              <option value="CONSULTATION">Consultation</option>
            </select>
          </Field>
        </div>

        <div>
          <Field label="Day">
            <select
              value={dayOfWeek}
              onChange={(e) => setDayOfWeek(Number(e.target.value))}
              className={inputClass()}
            >
              {DAY_LABELS.map((label, i) => (
                <option key={i} value={i}>
                  {label}
                </option>
              ))}
            </select>
          </Field>
        </div>

        <div>
          <Field label="Start">
            <input
              type="time"
              value={startTime}
              onChange={(e) => setStartTime(e.target.value)}
              className={inputClass()}
            />
          </Field>
        </div>

        <div>
          <Field label="End">
            <input
              type="time"
              value={endTime}
              onChange={(e) => setEndTime(e.target.value)}
              className={inputClass()}
            />
          </Field>
        </div>

        <PrimaryButton type="submit" disabled={adding}>
          Add
        </PrimaryButton>
      </form>
      {addError && <p className="mt-2 text-xs text-ink-red">{addError}</p>}
    </Card>
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
    <div className="flex flex-col gap-1 rounded-lg bg-paper p-2.5">
      <div className="flex items-center gap-2">
        <span className="w-24 text-sm text-ink">{DAY_LABELS[block.dayOfWeek ?? 0]}</span>
        <input
          type="time"
          value={startTime}
          onChange={(e) => setStartTime(e.target.value)}
          className={`!mt-0 ${inputClass()}`}
        />
        <span className="text-grey">–</span>
        <input
          type="time"
          value={endTime}
          onChange={(e) => setEndTime(e.target.value)}
          className={`!mt-0 ${inputClass()}`}
        />
        {dirty && (
          <button
            onClick={save}
            disabled={saving}
            className="rounded-full border border-ink-red/60 px-3 py-2 text-xs text-ink disabled:opacity-40"
          >
            Save
          </button>
        )}
        <button onClick={remove} className="ml-auto text-grey hover:text-ink-red">
          <Trash2 size={15} />
        </button>
      </div>
      {error && <p className="text-xs text-ink-red">{error}</p>}
    </div>
  );
}
