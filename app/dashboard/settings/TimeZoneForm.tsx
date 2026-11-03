"use client";

import { useState } from "react";
import { COMMON_TIME_ZONES } from "@/lib/timeZones";
import { Field, inputClass } from "../../ui";

export function TimeZoneForm({ timeZone }: { timeZone: string }) {
  const [value, setValue] = useState(timeZone);
  const [error, setError] = useState<string | null>(null);

  async function handleChange(next: string) {
    const previous = value;
    setValue(next);
    setError(null);
    const res = await fetch("/api/settings/time-zone", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ timeZone: next }),
    }).catch(() => null);
    if (!res?.ok) {
      setValue(previous);
      setError("Couldn't save your time zone.");
    }
  }

  const options = COMMON_TIME_ZONES.some((z) => z.value === value)
    ? COMMON_TIME_ZONES
    : [{ value, label: value }, ...COMMON_TIME_ZONES];

  return (
    <div>
      <Field label="Time zone">
        <select
          value={value}
          onChange={(e) => handleChange(e.target.value)}
          className={inputClass()}
        >
          {options.map((z) => (
            <option key={z.value} value={z.value}>
              {z.label}
            </option>
          ))}
        </select>
      </Field>
      {error && <p className="mt-2 text-sm text-ink-red">{error}</p>}
    </div>
  );
}
