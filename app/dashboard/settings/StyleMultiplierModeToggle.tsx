"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type Mode = "TIME" | "PRICE";

const OPTIONS: { value: Mode; label: string }[] = [
  { value: "TIME", label: "Time" },
  { value: "PRICE", label: "Price" },
];

const OPTION_WIDTH = 84;

export function StyleMultiplierModeToggle({ mode }: { mode: Mode }) {
  const router = useRouter();
  const [current, setCurrent] = useState<Mode>(mode);
  const [saving, setSaving] = useState(false);

  async function select(next: Mode) {
    if (next === current || saving) return;
    const previous = current;
    setCurrent(next);
    setSaving(true);
    try {
      const res = await fetch("/api/settings/style-multiplier-mode", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode: next }),
      });
      if (!res.ok) throw new Error("Couldn't save.");
      router.refresh();
    } catch {
      setCurrent(previous);
    } finally {
      setSaving(false);
    }
  }

  const activeIndex = OPTIONS.findIndex((o) => o.value === current);

  return (
    <div
      className="relative inline-flex rounded-full border border-line bg-card p-1"
      style={{ width: OPTION_WIDTH * OPTIONS.length + 8 }}
    >
      <div
        className="absolute inset-y-1 rounded-full bg-ink-red transition-transform duration-200 ease-out"
        style={{ width: OPTION_WIDTH, transform: `translateX(${activeIndex * OPTION_WIDTH}px)` }}
      />
      {OPTIONS.map((o) => (
        <button
          key={o.value}
          type="button"
          onClick={() => select(o.value)}
          disabled={saving}
          className={`relative z-10 rounded-full py-1.5 text-sm font-medium transition-colors disabled:cursor-not-allowed ${
            current === o.value ? "text-paper" : "text-ink"
          }`}
          style={{ width: OPTION_WIDTH }}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}
