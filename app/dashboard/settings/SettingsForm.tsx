"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { PricingConfig, BookingRules } from "@prisma/client";

// ---------------------------------------------------------------------------
// Shared bits
// ---------------------------------------------------------------------------

function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="text-xs text-paper/50">{label}</label>
      {children}
      {hint && <p className="mt-1 text-xs text-paper/30">{hint}</p>}
    </div>
  );
}

function inputClass() {
  return "mt-1 w-full rounded-sm border border-paper/10 bg-white/[0.02] px-3 py-2 text-sm text-paper outline-none focus:border-ink-red";
}

function SaveBar({
  saving,
  error,
  saved,
}: {
  saving: boolean;
  error: string | null;
  saved: boolean;
}) {
  return (
    <div className="mt-5 flex items-center gap-3">
      <button
        type="submit"
        disabled={saving}
        className="rounded-sm bg-ink-red px-5 py-2.5 text-sm font-medium text-paper disabled:opacity-40"
      >
        {saving ? "Saving…" : "Save"}
      </button>
      {saved && <span className="text-xs text-paper/50">Saved</span>}
      {error && <span className="text-xs text-ink-red">{error}</span>}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Pricing & deposit
// ---------------------------------------------------------------------------

export function PricingForm({ pricingConfig }: { pricingConfig: PricingConfig }) {
  const router = useRouter();
  const [hourlyRate, setHourlyRate] = useState(String(pricingConfig.hourlyRate));
  const [minimumPrice, setMinimumPrice] = useState(String(pricingConfig.minimumPrice));
  const [rangeSpreadPct, setRangeSpreadPct] = useState(
    String(Math.round(pricingConfig.rangeSpreadPct * 100))
  );
  const [depositType, setDepositType] = useState<"FLAT" | "PERCENT">(pricingConfig.depositType);
  const [depositFlat, setDepositFlat] = useState(
    pricingConfig.depositFlat != null ? String(pricingConfig.depositFlat) : ""
  );
  const [depositPercent, setDepositPercent] = useState(
    pricingConfig.depositPercent != null ? String(Math.round(pricingConfig.depositPercent * 100)) : ""
  );
  const [cancellationPolicy, setCancellationPolicy] = useState(pricingConfig.cancellationPolicy ?? "");

  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setSaved(false);
    setError(null);

    try {
      const res = await fetch("/api/settings/pricing", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          hourlyRate: Number(hourlyRate),
          minimumPrice: Number(minimumPrice),
          rangeSpreadPct: Number(rangeSpreadPct) / 100,
          depositType,
          depositFlat: depositType === "FLAT" ? Number(depositFlat) : null,
          depositPercent: depositType === "PERCENT" ? Number(depositPercent) / 100 : null,
          cancellationPolicy: cancellationPolicy || null,
        }),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error ?? "Couldn't save pricing.");
      }

      setSaved(true);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="rounded-sm border border-paper/10 bg-white/[0.02] p-5"
    >
      <div className="grid grid-cols-2 gap-4">
        <Field label="Hourly rate ($)">
          <input
            type="number"
            min="0"
            step="1"
            value={hourlyRate}
            onChange={(e) => setHourlyRate(e.target.value)}
            className={inputClass()}
          />
        </Field>

        <Field label="Minimum price ($)">
          <input
            type="number"
            min="0"
            step="1"
            value={minimumPrice}
            onChange={(e) => setMinimumPrice(e.target.value)}
            className={inputClass()}
          />
        </Field>

        <Field
          label="Estimate spread (%)"
          hint="Shown to clients as a price range, e.g. 15% = ±15%"
        >
          <input
            type="number"
            min="0"
            max="100"
            step="1"
            value={rangeSpreadPct}
            onChange={(e) => setRangeSpreadPct(e.target.value)}
            className={inputClass()}
          />
        </Field>
      </div>

      <div className="mt-5">
        <label className="text-xs text-paper/50">Deposit type</label>
        <div className="mt-1 flex gap-2">
          <button
            type="button"
            onClick={() => setDepositType("FLAT")}
            className={`flex-1 rounded-sm border px-4 py-2 text-sm ${
              depositType === "FLAT"
                ? "border-ink-red bg-ink-red/10 text-paper"
                : "border-paper/10 text-paper/70"
            }`}
          >
            Flat $
          </button>
          <button
            type="button"
            onClick={() => setDepositType("PERCENT")}
            className={`flex-1 rounded-sm border px-4 py-2 text-sm ${
              depositType === "PERCENT"
                ? "border-ink-red bg-ink-red/10 text-paper"
                : "border-paper/10 text-paper/70"
            }`}
          >
            % of estimate
          </button>
        </div>
      </div>

      <div className="mt-4">
        {depositType === "FLAT" ? (
          <Field label="Deposit amount ($)">
            <input
              type="number"
              min="0"
              step="1"
              value={depositFlat}
              onChange={(e) => setDepositFlat(e.target.value)}
              className={inputClass()}
            />
          </Field>
        ) : (
          <Field label="Deposit (% of low-end estimate)">
            <input
              type="number"
              min="0"
              max="100"
              step="1"
              value={depositPercent}
              onChange={(e) => setDepositPercent(e.target.value)}
              className={inputClass()}
            />
          </Field>
        )}
      </div>

      <div className="mt-4">
        <Field label="Cancellation policy (optional)">
          <textarea
            value={cancellationPolicy}
            onChange={(e) => setCancellationPolicy(e.target.value)}
            rows={2}
            className={inputClass()}
          />
        </Field>
      </div>

      <SaveBar saving={saving} error={error} saved={saved} />
    </form>
  );
}

// ---------------------------------------------------------------------------
// Booking rules
// ---------------------------------------------------------------------------

export function BookingRulesForm({ bookingRules }: { bookingRules: BookingRules }) {
  const router = useRouter();
  const [maxAutoBookDurationMins, setMaxAutoBookDurationMins] = useState(
    String(bookingRules.maxAutoBookDurationMins)
  );
  const [maxAutoBookComplexity, setMaxAutoBookComplexity] = useState(
    String(bookingRules.maxAutoBookComplexity)
  );
  const [minAiConfidence, setMinAiConfidence] = useState(
    String(Math.round(bookingRules.minAiConfidence * 100))
  );
  const [referenceFreedomMaxForAutoBook, setReferenceFreedomMaxForAutoBook] = useState(
    String(bookingRules.referenceFreedomMaxForAutoBook)
  );
  const [requireConsultAboveDurationMins, setRequireConsultAboveDurationMins] = useState(
    String(bookingRules.requireConsultAboveDurationMins)
  );
  const [consultationDurationMins, setConsultationDurationMins] = useState(
    String(bookingRules.consultationDurationMins)
  );

  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setSaved(false);
    setError(null);

    try {
      const res = await fetch("/api/settings/booking-rules", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          maxAutoBookDurationMins: Number(maxAutoBookDurationMins),
          maxAutoBookComplexity: Number(maxAutoBookComplexity),
          minAiConfidence: Number(minAiConfidence) / 100,
          referenceFreedomMaxForAutoBook: Number(referenceFreedomMaxForAutoBook),
          requireConsultAboveDurationMins: Number(requireConsultAboveDurationMins),
          consultationDurationMins: Number(consultationDurationMins),
        }),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error ?? "Couldn't save booking rules.");
      }

      setSaved(true);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="rounded-sm border border-paper/10 bg-white/[0.02] p-5"
    >
      <div className="grid grid-cols-2 gap-4">
        <Field label="Max duration to auto-book (mins)">
          <input
            type="number"
            min="1"
            step="1"
            value={maxAutoBookDurationMins}
            onChange={(e) => setMaxAutoBookDurationMins(e.target.value)}
            className={inputClass()}
          />
        </Field>

        <Field label="Max complexity to auto-book (1–10)">
          <input
            type="number"
            min="1"
            max="10"
            step="1"
            value={maxAutoBookComplexity}
            onChange={(e) => setMaxAutoBookComplexity(e.target.value)}
            className={inputClass()}
          />
        </Field>

        <Field label="Min AI confidence to auto-book (%)">
          <input
            type="number"
            min="0"
            max="100"
            step="1"
            value={minAiConfidence}
            onChange={(e) => setMinAiConfidence(e.target.value)}
            className={inputClass()}
          />
        </Field>

        <Field
          label="Max reference freedom to auto-book (0–100)"
          hint="Above this, the client wants too much of your own interpretation to auto-book"
        >
          <input
            type="number"
            min="0"
            max="100"
            step="1"
            value={referenceFreedomMaxForAutoBook}
            onChange={(e) => setReferenceFreedomMaxForAutoBook(e.target.value)}
            className={inputClass()}
          />
        </Field>

        <Field
          label="Require consultation above (mins)"
          hint="Hard cutoff — always needs a consultation past this length"
        >
          <input
            type="number"
            min="1"
            step="1"
            value={requireConsultAboveDurationMins}
            onChange={(e) => setRequireConsultAboveDurationMins(e.target.value)}
            className={inputClass()}
          />
        </Field>

        <Field label="Consultation length (mins)">
          <input
            type="number"
            min="1"
            step="1"
            value={consultationDurationMins}
            onChange={(e) => setConsultationDurationMins(e.target.value)}
            className={inputClass()}
          />
        </Field>
      </div>

      <SaveBar saving={saving} error={error} saved={saved} />
    </form>
  );
}
