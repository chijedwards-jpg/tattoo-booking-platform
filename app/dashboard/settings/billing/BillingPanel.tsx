"use client";

import { useState } from "react";
import { PrimaryButton } from "../../../ui";

export function BillingPanel({ status }: { status: string | null }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleManageBilling() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/billing/portal", { method: "POST" });
      const body = await res.json().catch(() => ({}));
      if (!res.ok || !body.url) throw new Error(body.error ?? "Could not open billing portal.");
      window.location.href = body.url;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
      setLoading(false);
    }
  }

  const statusLabel =
    status === "trialing" ? "Free trial" : status === "active" ? "Active — $29/mo" : status ?? "Not subscribed";

  return (
    <div className="rounded-xl border border-line bg-card p-5">
      <p className="text-sm text-grey">Current plan</p>
      <p className="mt-1 font-display text-xl text-ink">{statusLabel}</p>
      <div className="mt-4">
        <PrimaryButton onClick={handleManageBilling} disabled={loading}>
          {loading ? "Opening…" : "Manage billing"}
        </PrimaryButton>
      </div>
      {error && <p className="mt-2 text-sm text-ink-red">{error}</p>}
      <p className="mt-3 text-xs text-grey">
        Opens Stripe's billing portal — update your card, view invoices, or cancel your subscription.
      </p>
    </div>
  );
}
