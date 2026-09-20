"use client";

import { useState } from "react";
import { Trash2 } from "lucide-react";
import type { TattooStyle, ArtistRestriction, RestrictionType } from "@prisma/client";
import { PLACEMENTS } from "@/lib/placements";
import { VALID_STYLES } from "@/lib/aiAnalysis";
import { Card, Field, PrimaryButton, inputClass } from "../../ui";

// ---------------------------------------------------------------------------
// Tattoo styles
// ---------------------------------------------------------------------------

export function StylesForm({ styles }: { styles: TattooStyle[] }) {
  const [rows, setRows] = useState(styles);
  const [newName, setNewName] = useState("");
  const [newMultiplier, setNewMultiplier] = useState("1.0");
  const [addError, setAddError] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);

  async function addStyle(e: React.FormEvent) {
    e.preventDefault();
    setAdding(true);
    setAddError(null);
    try {
      const res = await fetch("/api/settings/styles", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newName, timeMultiplier: Number(newMultiplier) }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error ?? "Couldn't add style.");
      }
      const { style } = await res.json();
      setRows((r) => [...r, style]);
      setNewName("");
      setNewMultiplier("1.0");
    } catch (err) {
      setAddError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setAdding(false);
    }
  }

  return (
    <Card>
      <div className="flex flex-col gap-2">
        {rows.map((style) => (
          <StyleRow
            key={style.id}
            style={style}
            onSaved={(updated) => setRows((r) => r.map((s) => (s.id === updated.id ? updated : s)))}
            onDeleted={(id) => setRows((r) => r.filter((s) => s.id !== id))}
          />
        ))}
        {rows.length === 0 && <p className="text-sm text-grey">No styles configured yet.</p>}
      </div>

      <form onSubmit={addStyle} className="mt-4 flex items-end gap-2 border-t border-line pt-4">
        <div className="flex-1">
          <Field label="Style name">
            <input
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="e.g. Watercolor"
              className={inputClass()}
              required
            />
          </Field>
        </div>
        <div className="w-28">
          <Field label="Time ×">
            <input
              type="number"
              step="0.1"
              min="0.1"
              value={newMultiplier}
              onChange={(e) => setNewMultiplier(e.target.value)}
              className={inputClass()}
              required
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

function StyleRow({
  style,
  onSaved,
  onDeleted,
}: {
  style: TattooStyle;
  onSaved: (style: TattooStyle) => void;
  onDeleted: (id: string) => void;
}) {
  const [name, setName] = useState(style.name);
  const [timeMultiplier, setTimeMultiplier] = useState(String(style.timeMultiplier));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const dirty = name !== style.name || Number(timeMultiplier) !== style.timeMultiplier;

  async function save() {
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`/api/settings/styles/${style.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, timeMultiplier: Number(timeMultiplier) }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error ?? "Couldn't save.");
      }
      const { style: updated } = await res.json();
      onSaved(updated);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setSaving(false);
    }
  }

  async function toggleActive() {
    setError(null);
    const res = await fetch(`/api/settings/styles/${style.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ active: !style.active }),
    });
    if (!res.ok) {
      setError("Couldn't update.");
      return;
    }
    const { style: updated } = await res.json();
    onSaved(updated);
  }

  async function remove() {
    setError(null);
    const res = await fetch(`/api/settings/styles/${style.id}`, { method: "DELETE" });
    if (!res.ok) {
      setError("Couldn't delete.");
      return;
    }
    onDeleted(style.id);
  }

  return (
    <div className="flex flex-col gap-1 rounded-lg bg-paper p-2.5">
      <div className="flex items-center gap-2">
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          className={`w-40 !mt-0 ${inputClass()} ${!style.active ? "opacity-40" : ""}`}
        />
        <input
          type="number"
          step="0.1"
          min="0.1"
          value={timeMultiplier}
          onChange={(e) => setTimeMultiplier(e.target.value)}
          className={`w-20 !mt-0 ${inputClass()} ${!style.active ? "opacity-40" : ""}`}
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
        <label className="ml-2 flex items-center gap-1.5 text-xs text-grey">
          <input type="checkbox" checked={style.active} onChange={toggleActive} />
          Active
        </label>
        <button onClick={remove} className="ml-auto text-grey hover:text-ink-red">
          <Trash2 size={15} />
        </button>
      </div>
      {error && <p className="text-xs text-ink-red">{error}</p>}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Restrictions
// ---------------------------------------------------------------------------

const TYPE_LABEL: Record<RestrictionType, string> = {
  PLACEMENT: "Placement",
  STYLE: "Style",
  SUBJECT_MATTER: "Subject matter",
  OTHER: "Other",
};

// Only these two are actually checked by the auto-book routing decision
// today (see decideRouting in lib/pricingEngine.ts) — subject matter and
// "other" restrictions are recorded but don't yet block anything
// automatically, since there's no subject-matter detection in the AI
// analysis step.
const ENFORCED_TYPES: RestrictionType[] = ["PLACEMENT", "STYLE"];

export function RestrictionsForm({ restrictions }: { restrictions: ArtistRestriction[] }) {
  const [rows, setRows] = useState(restrictions);
  const [type, setType] = useState<RestrictionType>("PLACEMENT");
  const [value, setValue] = useState<string>(PLACEMENTS[0].value);
  const [customValue, setCustomValue] = useState("");
  const [adding, setAdding] = useState(false);
  const [addError, setAddError] = useState<string | null>(null);

  const usesDropdown = type === "PLACEMENT" || type === "STYLE";
  const options = type === "PLACEMENT" ? PLACEMENTS.map((p) => p.value) : VALID_STYLES;

  function handleTypeChange(next: RestrictionType) {
    setType(next);
    if (next === "PLACEMENT") setValue(PLACEMENTS[0].value);
    else if (next === "STYLE") setValue(VALID_STYLES[0]);
  }

  async function addRestriction(e: React.FormEvent) {
    e.preventDefault();
    const finalValue = usesDropdown ? value : customValue.trim();
    if (!finalValue) return;

    setAdding(true);
    setAddError(null);
    try {
      const res = await fetch("/api/settings/restrictions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type, value: finalValue }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error ?? "Couldn't add restriction.");
      }
      const { restriction } = await res.json();
      setRows((r) => [...r, restriction]);
      setCustomValue("");
    } catch (err) {
      setAddError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setAdding(false);
    }
  }

  async function remove(id: string) {
    const res = await fetch(`/api/settings/restrictions/${id}`, { method: "DELETE" });
    if (res.ok) setRows((r) => r.filter((x) => x.id !== id));
  }

  return (
    <Card>
      <div className="flex flex-col gap-2">
        {rows.map((r) => (
          <div key={r.id} className="flex items-center gap-3 text-sm">
            <span className="rounded-full bg-paper px-2 py-0.5 font-mono text-[11px] uppercase tracking-wide text-grey">
              {TYPE_LABEL[r.type]}
            </span>
            <span className="text-ink">{r.value}</span>
            {!ENFORCED_TYPES.includes(r.type) && (
              <span className="text-xs text-grey">(not auto-enforced yet)</span>
            )}
            <button onClick={() => remove(r.id)} className="ml-auto text-grey hover:text-ink-red">
              <Trash2 size={15} />
            </button>
          </div>
        ))}
        {rows.length === 0 && <p className="text-sm text-grey">No restrictions configured.</p>}
      </div>

      <form onSubmit={addRestriction} className="mt-4 flex items-end gap-2 border-t border-line pt-4">
        <div>
          <Field label="Type">
            <select
              value={type}
              onChange={(e) => handleTypeChange(e.target.value as RestrictionType)}
              className={inputClass()}
            >
              {(Object.keys(TYPE_LABEL) as RestrictionType[]).map((t) => (
                <option key={t} value={t}>
                  {TYPE_LABEL[t]}
                </option>
              ))}
            </select>
          </Field>
        </div>

        <div className="flex-1">
          <Field label="Value">
            {usesDropdown ? (
              <select value={value} onChange={(e) => setValue(e.target.value)} className={inputClass()}>
                {options.map((o) => (
                  <option key={o} value={o}>
                    {o}
                  </option>
                ))}
              </select>
            ) : (
              <input
                value={customValue}
                onChange={(e) => setCustomValue(e.target.value)}
                placeholder="e.g. coverups"
                className={inputClass()}
              />
            )}
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
