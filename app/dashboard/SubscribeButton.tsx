"use client";

import { useState } from "react";
import { PrimaryButton } from "../ui";

export function SubscribeButton({ label }: { label: string }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleClick() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/billing/checkout", { method: "POST" });
      const body = await res.json().catch(() => ({}));
      if (!res.ok || !body.url) throw new Error(body.error ?? "Could not start checkout.");
      window.location.href = body.url;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
      setLoading(false);
    }
  }

  return (
    <div>
      <PrimaryButton onClick={handleClick} disabled={loading}>
        {loading ? "Redirecting…" : label}
      </PrimaryButton>
      {error && <p className="mt-2 text-sm text-ink-red">{error}</p>}
    </div>
  );
}
