"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowLeft, ArrowRight, Check } from "lucide-react";
import { CALIBRATION_EXAMPLES, priceRangeOptions } from "@/lib/calibration";
import { Card, Chip, Field, GhostButton, PrimaryButton, StepDots, inputClass } from "../../../../ui";

interface Change {
  style: string;
  before: number | null;
  after: number;
  fromExample: string;
}

const EXAMPLE_COUNT = CALIBRATION_EXAMPLES.length;

// What the artist has typed or picked for one example.
interface Entry {
  hours: string;
  choice: number | "custom" | null; // index into the range options
  low: string; // custom range only
  high: string;
}

const EMPTY_ENTRY: Entry = { hours: "", choice: null, low: "", high: "" };

// A complete answer, or null if the example is skipped or half-filled.
function resolveEntry(entry: Entry | undefined, rate: number): { hours: number; low: number; high: number } | null {
  if (!entry) return null;
  const hours = Number(entry.hours);
  if (!(hours > 0)) return null;
  if (entry.choice === "custom") {
    const low = Number(entry.low);
    const high = Number(entry.high);
    return low > 0 && high >= low ? { hours, low, high } : null;
  }
  if (entry.choice === null) return null;
  const range = priceRangeOptions(hours, rate)[entry.choice];
  return range ? { hours, ...range } : null;
}

export function CalibrationFlow({ hourlyRate, welcome }: { hourlyRate: number; welcome: boolean }) {
  // step 0 = hourly rate, 1..EXAMPLE_COUNT = one example each
  const [step, setStep] = useState(0);
  const [rate, setRate] = useState(String(hourlyRate));
  const [entries, setEntries] = useState<Record<string, Entry>>({});
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [changes, setChanges] = useState<Change[] | null>(null);

  const rateValue = Number(rate);
  const rateValid = rateValue > 0;
  const answers = Object.fromEntries(
    CALIBRATION_EXAMPLES.map((e) => [e.id, resolveEntry(entries[e.id], rateValue)])
  );
  const pricedCount = Object.values(answers).filter(Boolean).length;

  async function submit() {
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/settings/calibration", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          hourlyRate: rateValue,
          answers,
        }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body.error ?? "Couldn't save your prices.");
      setChanges(body.changes);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setSaving(false);
    }
  }

  if (changes) return <Results changes={changes} hourlyRate={rateValue} />;

  const skipLink = (
    <Link href={welcome ? "/dashboard" : "/dashboard/settings/styles"} className="text-sm text-grey underline hover:text-ink">
      {welcome ? "Skip for now, keep the default prices" : "Cancel"}
    </Link>
  );

  return (
    <div>
      <h1 className="font-display text-3xl text-ink">{welcome ? "Teach us your prices" : "Calibrate your prices"}</h1>
      <p className="mt-1 text-sm text-grey">
        For {EXAMPLE_COUNT} example tattoos, tell us how long each would take you and the price range you&apos;d quote.
        We use your answers to tune each
        style, so the estimates clients see sound like you. Takes about two minutes, and you can change anything later in
        Styles & Time.
      </p>

      <div className="mt-6">
        <StepDots count={EXAMPLE_COUNT + 1} current={step} />
      </div>

      {step === 0 ? (
        <Card className="mt-6">
          <Field label="Your hourly rate" hint="What you charge for an hour of tattooing.">
            <div className="relative w-40">
              <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-grey">$</span>
              <input
                type="number"
                inputMode="decimal"
                min="1"
                value={rate}
                onChange={(e) => setRate(e.target.value)}
                className={inputClass("pl-7")}
                autoFocus
              />
            </div>
          </Field>
          <div className="mt-6 flex items-center justify-between gap-4">
            {skipLink}
            <PrimaryButton onClick={() => setStep(1)} disabled={!rateValid}>
              Start <ArrowRight size={15} />
            </PrimaryButton>
          </div>
        </Card>
      ) : (
        <ExampleStep
          key={step}
          index={step - 1}
          entry={entries[CALIBRATION_EXAMPLES[step - 1].id] ?? EMPTY_ENTRY}
          onChange={(patch) =>
            setEntries((all) => {
              const id = CALIBRATION_EXAMPLES[step - 1].id;
              return { ...all, [id]: { ...(all[id] ?? EMPTY_ENTRY), ...patch } };
            })
          }
          hourlyRate={rateValue}
          answered={answers[CALIBRATION_EXAMPLES[step - 1].id] !== null}
          onBack={() => setStep(step - 1)}
          onNext={() => setStep(step + 1)}
          onFinish={submit}
          isLast={step === EXAMPLE_COUNT}
          canFinish={pricedCount > 0}
          saving={saving}
          error={error}
        />
      )}

      {step > 0 && <div className="mt-4 text-center">{skipLink}</div>}
    </div>
  );
}

function money(n: number): string {
  return `$${n.toLocaleString("en-US", { maximumFractionDigits: 0 })}`;
}

function ExampleStep({
  index,
  entry,
  onChange,
  hourlyRate,
  answered,
  onBack,
  onNext,
  onFinish,
  isLast,
  canFinish,
  saving,
  error,
}: {
  index: number;
  entry: Entry;
  onChange: (patch: Partial<Entry>) => void;
  hourlyRate: number;
  answered: boolean;
  onBack: () => void;
  onNext: () => void;
  onFinish: () => void;
  isLast: boolean;
  canFinish: boolean;
  saving: boolean;
  error: string | null;
}) {
  const ex = CALIBRATION_EXAMPLES[index];
  const hours = Number(entry.hours);
  const options = priceRangeOptions(hours, hourlyRate);
  const started = entry.hours !== "" || entry.choice !== null;

  function advance() {
    if (isLast) onFinish();
    else onNext();
  }

  return (
    <Card className="mt-6">
      <div className="flex items-baseline justify-between gap-4">
        <p className="font-mono text-[11px] uppercase tracking-wide text-grey">
          Example {index + 1} of {EXAMPLE_COUNT}
        </p>
        <p className="font-display text-lg text-ink">{ex.style}</p>
      </div>

      <div className="mt-3 overflow-hidden rounded-xl bg-ink">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={ex.image} alt={`${ex.style} tattoo example`} className="mx-auto max-h-[420px] w-auto object-contain" />
      </div>
      <p className="mt-1.5 text-[11px] text-grey">
        Photo: {ex.credit.author}
        {" · "}
        {ex.credit.licenseUrl ? (
          <a href={ex.credit.licenseUrl} target="_blank" rel="noopener noreferrer" className="underline">
            {ex.credit.license}
          </a>
        ) : (
          ex.credit.license
        )}
        {" · "}
        <a href={ex.credit.sourceUrl} target="_blank" rel="noopener noreferrer" className="underline">
          source
        </a>
      </p>

      <dl className="mt-4 grid grid-cols-2 gap-3 text-sm">
        <div>
          <dt className="font-mono text-[11px] uppercase tracking-wide text-grey">Size</dt>
          <dd className="text-ink">{ex.size}</dd>
        </div>
        <div>
          <dt className="font-mono text-[11px] uppercase tracking-wide text-grey">Placement</dt>
          <dd className="text-ink">{ex.placement}</dd>
        </div>
      </dl>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (started && !answered) return; // half-filled: finish it or clear it
          if (!isLast || canFinish) advance();
        }}
        className="mt-5"
      >
        <Field label="How long would this take you?" hint="Hours of tattooing for the finished piece. Leave it blank if you don't do this style.">
          <div className="relative w-40">
            <input
              type="number"
              inputMode="decimal"
              min="0.5"
              step="0.5"
              value={entry.hours}
              // New hours mean new range choices, so an earlier pick no longer applies.
              onChange={(e) =>
                onChange({
                  hours: e.target.value,
                  choice: entry.choice === "custom" && e.target.value !== "" ? "custom" : null,
                })
              }
              className={inputClass("pr-12")}
              autoFocus
            />
            <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-sm text-grey">hrs</span>
          </div>
        </Field>

        {options.length > 0 && (
          <div className="mt-5">
            <p className="font-mono text-[11px] uppercase tracking-wide text-grey">What would you charge?</p>
            <p className="mt-0.5 text-xs text-grey">
              {money(hours * hourlyRate)} is {hours} {hours === 1 ? "hour" : "hours"} at your rate. Pick the range
              you&apos;d quote.
            </p>
            <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-3">
              {options.map((o, i) => (
                <Chip key={i} active={entry.choice === i} onClick={() => onChange({ choice: i })}>
                  <span className="block text-center font-mono">
                    {money(o.low)}–{money(o.high)}
                  </span>
                </Chip>
              ))}
            </div>
            <button
              type="button"
              onClick={() => onChange({ choice: "custom" })}
              className={`mt-2 text-sm underline ${entry.choice === "custom" ? "text-ink" : "text-grey hover:text-ink"}`}
            >
              None of these, enter my own range
            </button>
            {entry.choice === "custom" && (
              <div className="mt-2 flex items-center gap-2">
                <MoneyInput value={entry.low} onChange={(v) => onChange({ low: v })} label="Low end" />
                <span className="text-grey">–</span>
                <MoneyInput value={entry.high} onChange={(v) => onChange({ high: v })} label="High end" />
              </div>
            )}
          </div>
        )}

        {error && <p className="mt-3 text-xs text-ink-red">{error}</p>}
        {started && !answered && (
          <p className="mt-3 text-xs text-grey">
            {entry.choice === "custom" ? "Enter a low and high price to continue." : "Pick a range to continue."}
          </p>
        )}
        {isLast && !canFinish && (
          <p className="mt-3 text-xs text-grey">Price at least one example to finish, or skip for now.</p>
        )}

        <div className="mt-6 flex items-center justify-between gap-3">
          <GhostButton onClick={onBack}>
            <ArrowLeft size={15} /> Back
          </GhostButton>
          {isLast ? (
            <PrimaryButton type="submit" disabled={!canFinish || saving || (started && !answered)}>
              {saving ? "Saving…" : "Finish"} <Check size={15} />
            </PrimaryButton>
          ) : (
            <PrimaryButton type="submit" disabled={started && !answered}>
              {started ? "Next" : "I don't do this style"} <ArrowRight size={15} />
            </PrimaryButton>
          )}
        </div>
      </form>
    </Card>
  );
}

function MoneyInput({ value, onChange, label }: { value: string; onChange: (v: string) => void; label: string }) {
  return (
    <div className="relative w-32">
      <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-grey">$</span>
      <input
        type="number"
        inputMode="decimal"
        min="1"
        aria-label={label}
        placeholder={label}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={inputClass("pl-7")}
      />
    </div>
  );
}

function Results({ changes, hourlyRate }: { changes: Change[]; hourlyRate: number }) {
  const exampleStyles = new Set(CALIBRATION_EXAMPLES.map((e) => e.style.toLowerCase()));
  const main = changes.filter((c) => exampleStyles.has(c.style.toLowerCase()));
  const followers = changes.filter((c) => !exampleStyles.has(c.style.toLowerCase()));

  return (
    <div>
      <h1 className="font-display text-3xl text-ink">Your prices are set</h1>
      <p className="mt-1 text-sm text-grey">
        Hourly rate ${hourlyRate.toFixed(0)}. Each style's multiplier now matches the middle of the range you picked for its example, so a client
        asking for something similar gets an estimate close to what you'd quote.
      </p>

      <Card className="mt-6">
        <ChangeTable rows={main} />
        {followers.length > 0 && (
          <>
            <p className="mt-5 font-mono text-[11px] uppercase tracking-wide text-grey">Related styles that follow along</p>
            <ChangeTable rows={followers} showSource />
          </>
        )}
      </Card>

      <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
        <Link href="/dashboard/settings/styles" className="text-sm text-ink underline">
          Fine-tune in Styles & Time
        </Link>
        <Link
          href="/dashboard"
          className="inline-flex items-center justify-center gap-2 rounded-full bg-ink-red px-5 py-3 text-sm font-medium text-paper transition-opacity hover:opacity-90"
        >
          Go to dashboard <ArrowRight size={15} />
        </Link>
      </div>
    </div>
  );
}

function ChangeTable({ rows, showSource }: { rows: Change[]; showSource?: boolean }) {
  return (
    <table className="mt-2 w-full text-sm">
      <tbody>
        {rows.map((c) => {
          const source = CALIBRATION_EXAMPLES.find((e) => e.id === c.fromExample)?.style;
          return (
            <tr key={c.style} className="border-b border-line last:border-0">
              <td className="py-2 text-ink">
                {c.style}
                {showSource && source && <span className="ml-2 text-xs text-grey">like {source}</span>}
              </td>
              <td className="py-2 text-right font-mono text-grey">
                {c.before === null ? "new" : `×${c.before.toFixed(2)}`}
              </td>
              <td className="w-8 py-2 text-center text-grey">→</td>
              <td className="w-16 py-2 text-right font-mono text-ink">×{c.after.toFixed(2)}</td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}
