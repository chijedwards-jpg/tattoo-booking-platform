"use client";

import { useState } from "react";
import { SlotBooker, BookedConfirmation, type Slot } from "../../SlotBooker";
import { PLACEMENTS, type Placement } from "@/lib/placements";

const SIZE_PRESETS = [
  { value: "coin", label: "Coin-sized", hint: "~1–2 in" },
  { value: "palm", label: "Palm-sized", hint: "~3–4 in" },
  { value: "phone", label: "Phone-sized", hint: "~5–6 in" },
  { value: "hand", label: "Hand-sized", hint: "~7–9 in" },
  { value: "larger", label: "Larger", hint: "custom" },
];

type Step = 1 | 2 | 3 | 4 | 5 | 6;

interface SubmissionResult {
  submissionId: string;
  status: "GREEN_AUTO_BOOKABLE" | "YELLOW_ARTIST_REVIEW" | "RED_CONSULTATION_REQUIRED";
  estimate: { priceLow: number; priceHigh: number; hours: number };
  deposit: { amount: number; instructions: string | null };
  detectedStyle: string;
}

export default function IntakeFlow({
  artistSlug,
  artistName,
}: {
  artistSlug: string;
  artistName: string;
}) {
  const [step, setStep] = useState<Step>(1);

  const [inspirationPreview, setInspirationPreview] = useState<string | null>(null);
  const [inspirationFile, setInspirationFile] = useState<File | null>(null);

  const [freedom, setFreedom] = useState(20); // 0 = follow reference, 100 = artist's interpretation
  const [placement, setPlacement] = useState<Placement | null>(null);
  const [sizePreset, setSizePreset] = useState<string | null>(null);
  const [customWidth, setCustomWidth] = useState("");
  const [customHeight, setCustomHeight] = useState("");
  const [description, setDescription] = useState("");
  const [email, setEmail] = useState("");

  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [result, setResult] = useState<SubmissionResult | null>(null);

  async function handleSubmit() {
    if (!inspirationFile || !placement) return;
    setSubmitting(true);
    setSubmitError(null);

    try {
      const dataUrl = await fileToDataUrl(inspirationFile);

      const res = await fetch("/api/submissions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          artistSlug,
          clientEmail: email,
          inspirationImageDataUrl: dataUrl,
          placement,
          sizePreset: sizePreset ?? undefined,
          sizeInches: customWidth ? Number(customWidth) : undefined,
          referenceFreedom: freedom,
          description: description || undefined,
        }),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error ?? "Something went wrong. Please try again.");
      }

      const data: SubmissionResult = await res.json();
      setResult(data);
      setStep(6);
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setSubmitting(false);
    }
  }

  function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setInspirationFile(file);
    setInspirationPreview(URL.createObjectURL(file));
  }

  function next() {
    setStep((s) => (s < 5 ? ((s + 1) as Step) : s));
  }
  function back() {
    setStep((s) => (s > 1 ? ((s - 1) as Step) : s));
  }

  return (
    <main className="min-h-screen bg-ink text-paper">
      <div className="mx-auto flex min-h-screen max-w-md flex-col px-5 py-8">
        <Header step={step} artistName={artistName} />

        <div className="mt-8 flex-1">
          {step === 1 && (
            <UploadStep
              preview={inspirationPreview}
              onUpload={handleUpload}
              onNext={next}
            />
          )}

          {step === 2 && (
            <FreedomStep
              freedom={freedom}
              setFreedom={setFreedom}
              onNext={next}
              onBack={back}
            />
          )}

          {step === 3 && (
            <PlacementStep
              placement={placement}
              setPlacement={setPlacement}
              onNext={next}
              onBack={back}
            />
          )}

          {step === 4 && (
            <SizeStep
              sizePreset={sizePreset}
              setSizePreset={setSizePreset}
              customWidth={customWidth}
              setCustomWidth={setCustomWidth}
              customHeight={customHeight}
              setCustomHeight={setCustomHeight}
              onNext={next}
              onBack={back}
            />
          )}

          {step === 5 && (
            <DetailsStep
              description={description}
              setDescription={setDescription}
              email={email}
              setEmail={setEmail}
              preview={inspirationPreview}
              placement={placement}
              sizePreset={sizePreset}
              freedom={freedom}
              onBack={back}
              onSubmit={handleSubmit}
              submitting={submitting}
              submitError={submitError}
            />
          )}

          {step === 6 && result && <ResultStep result={result} />}
        </div>
      </div>
    </main>
  );
}

// ---------------------------------------------------------------------------
// Header / progress
// ---------------------------------------------------------------------------

function Header({ step, artistName }: { step: Step; artistName: string }) {
  return (
    <div>
      <p className="font-display text-2xl tracking-tight text-paper">
        Start your tattoo with {artistName}
      </p>
      {step <= 5 && (
        <div className="mt-4 flex gap-1.5">
          {[1, 2, 3, 4, 5].map((i) => (
            <div
              key={i}
              className={`h-1 flex-1 rounded-full transition-colors ${
                i <= step ? "bg-ink-red" : "bg-white/10"
              }`}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Step 1 — Upload
// ---------------------------------------------------------------------------

function UploadStep({
  preview,
  onUpload,
  onNext,
}: {
  preview: string | null;
  onUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onNext: () => void;
}) {
  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="font-display text-3xl leading-tight text-paper">
          What are you looking to get tattooed?
        </h1>
        <p className="mt-2 text-sm text-paper/60">
          Upload a photo, screenshot, or drawing of what you have in mind.
        </p>
      </div>

      <label className="group relative flex aspect-square w-full cursor-pointer flex-col items-center justify-center overflow-hidden rounded-sm border border-dashed border-paper/25 bg-white/[0.02] transition-colors hover:border-ink-red/60">
        {preview ? (
          <img src={preview} alt="Inspiration" className="h-full w-full object-cover" />
        ) : (
          <div className="flex flex-col items-center gap-3 px-8 text-center">
            <PlusIcon />
            <span className="text-sm text-paper/50">
              Tap to upload an image
            </span>
          </div>
        )}
        <input
          type="file"
          accept="image/jpeg,image/png,image/heic"
          className="hidden"
          onChange={onUpload}
        />
      </label>

      <button
        disabled={!preview}
        onClick={onNext}
        className="w-full rounded-sm bg-ink-red py-3.5 font-medium text-paper transition-opacity disabled:opacity-30"
      >
        Continue
      </button>
    </div>
  );
}

function PlusIcon() {
  return (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" className="text-paper/40">
      <path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

// ---------------------------------------------------------------------------
// Step 2 — Reference freedom slider
// ---------------------------------------------------------------------------

function FreedomStep({
  freedom,
  setFreedom,
  onNext,
  onBack,
}: {
  freedom: number;
  setFreedom: (n: number) => void;
  onNext: () => void;
  onBack: () => void;
}) {
  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="font-display text-3xl leading-tight text-paper">
          How closely should we follow this?
        </h1>
        <p className="mt-2 text-sm text-paper/60">
          Slide toward the artist's side if you want them to adapt it to your body and their style.
        </p>
      </div>

      <div className="rounded-sm border border-paper/10 bg-white/[0.02] p-6">
        <input
          type="range"
          min={0}
          max={100}
          value={freedom}
          onChange={(e) => setFreedom(Number(e.target.value))}
          className="w-full accent-ink-red"
        />
        <div className="mt-4 flex justify-between text-xs text-paper/50">
          <span>Follow the reference</span>
          <span>Artist's interpretation</span>
        </div>
      </div>

      <StepNav onNext={onNext} onBack={onBack} />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Step 3 — Placement
// ---------------------------------------------------------------------------

function PlacementStep({
  placement,
  setPlacement,
  onNext,
  onBack,
}: {
  placement: Placement | null;
  setPlacement: (p: Placement) => void;
  onNext: () => void;
  onBack: () => void;
}) {
  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="font-display text-3xl leading-tight text-paper">
          Where do you want it?
        </h1>
      </div>

      <div className="grid grid-cols-2 gap-2">
        {PLACEMENTS.map((p) => (
          <button
            key={p.value}
            onClick={() => setPlacement(p.value)}
            className={`rounded-sm border px-4 py-3 text-left text-sm transition-colors ${
              placement === p.value
                ? "border-ink-red bg-ink-red/10 text-paper"
                : "border-paper/10 bg-white/[0.02] text-paper/70 hover:border-paper/25"
            }`}
          >
            {p.label}
          </button>
        ))}
      </div>

      <StepNav onNext={onNext} onBack={onBack} disabled={!placement} />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Step 4 — Size
// ---------------------------------------------------------------------------

function SizeStep({
  sizePreset,
  setSizePreset,
  customWidth,
  setCustomWidth,
  customHeight,
  setCustomHeight,
  onNext,
  onBack,
}: {
  sizePreset: string | null;
  setSizePreset: (s: string) => void;
  customWidth: string;
  setCustomWidth: (s: string) => void;
  customHeight: string;
  setCustomHeight: (s: string) => void;
  onNext: () => void;
  onBack: () => void;
}) {
  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="font-display text-3xl leading-tight text-paper">
          About how big?
        </h1>
      </div>

      <div className="flex flex-col gap-2">
        {SIZE_PRESETS.map((s) => (
          <button
            key={s.value}
            onClick={() => setSizePreset(s.value)}
            className={`flex items-center justify-between rounded-sm border px-4 py-3.5 text-left transition-colors ${
              sizePreset === s.value
                ? "border-ink-red bg-ink-red/10"
                : "border-paper/10 bg-white/[0.02] hover:border-paper/25"
            }`}
          >
            <span className="text-sm text-paper">{s.label}</span>
            <span className="text-xs text-paper/40">{s.hint}</span>
          </button>
        ))}
      </div>

      {sizePreset === "larger" && (
        <div className="flex gap-3">
          <div className="flex-1">
            <label className="text-xs text-paper/50">Width (in)</label>
            <input
              type="number"
              value={customWidth}
              onChange={(e) => setCustomWidth(e.target.value)}
              className="mt-1 w-full rounded-sm border border-paper/10 bg-white/[0.02] px-3 py-2 text-paper outline-none focus:border-ink-red"
            />
          </div>
          <div className="flex-1">
            <label className="text-xs text-paper/50">Height (in)</label>
            <input
              type="number"
              value={customHeight}
              onChange={(e) => setCustomHeight(e.target.value)}
              className="mt-1 w-full rounded-sm border border-paper/10 bg-white/[0.02] px-3 py-2 text-paper outline-none focus:border-ink-red"
            />
          </div>
        </div>
      )}

      <StepNav onNext={onNext} onBack={onBack} disabled={!sizePreset} />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Step 5 — Details + summary (submission happens here, wired up later)
// ---------------------------------------------------------------------------

function DetailsStep({
  description,
  setDescription,
  email,
  setEmail,
  preview,
  placement,
  sizePreset,
  freedom,
  onBack,
  onSubmit,
  submitting,
  submitError,
}: {
  description: string;
  setDescription: (s: string) => void;
  email: string;
  setEmail: (s: string) => void;
  preview: string | null;
  placement: Placement | null;
  sizePreset: string | null;
  freedom: number;
  onBack: () => void;
  onSubmit: () => void;
  submitting: boolean;
  submitError: string | null;
}) {
  const emailValid = /\S+@\S+\.\S+/.test(email);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="font-display text-3xl leading-tight text-paper">
          Last thing — where should we send your estimate?
        </h1>
      </div>

      <div>
        <label className="text-xs text-paper/50">Email</label>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@email.com"
          className="mt-1 w-full rounded-sm border border-paper/10 bg-white/[0.02] px-4 py-3 text-sm text-paper outline-none placeholder:text-paper/30 focus:border-ink-red"
        />
      </div>

      <div>
        <label className="text-xs text-paper/50">Anything else? (optional)</label>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="e.g. Keep it black and grey, make the lettering a bit bigger…"
          rows={3}
          className="mt-1 w-full rounded-sm border border-paper/10 bg-white/[0.02] px-4 py-3 text-sm text-paper outline-none placeholder:text-paper/30 focus:border-ink-red"
        />
      </div>

      <div className="rounded-sm border border-paper/10 bg-white/[0.02] p-4">
        <p className="text-xs uppercase tracking-wide text-paper/40">Summary</p>
        <div className="mt-3 flex gap-3">
          {preview && (
            <img src={preview} className="h-16 w-16 rounded-sm object-cover" />
          )}
          <div className="flex flex-col justify-center gap-1 text-sm text-paper/80">
            <span>{PLACEMENTS.find((p) => p.value === placement)?.label ?? "—"}</span>
            <span>{SIZE_PRESETS.find((s) => s.value === sizePreset)?.label ?? "—"}</span>
            <span>{freedom}% artist's interpretation</span>
          </div>
        </div>
      </div>

      {submitError && (
        <p className="rounded-sm border border-ink-red/40 bg-ink-red/10 px-4 py-3 text-sm text-paper">
          {submitError}
        </p>
      )}

      <StepNav
        onNext={onSubmit}
        onBack={onBack}
        disabled={!emailValid || submitting}
        nextLabel={submitting ? "Analyzing your tattoo…" : "Get my estimate"}
      />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Step 6 — Result
// ---------------------------------------------------------------------------

function ResultStep({ result }: { result: SubmissionResult }) {
  if (result.status === "GREEN_AUTO_BOOKABLE") {
    return <BookingStep result={result} />;
  }

  if (result.status === "YELLOW_ARTIST_REVIEW") {
    return (
      <div className="flex flex-col gap-4">
        <h1 className="font-display text-3xl leading-tight text-paper">
          Your tattoo needs a quick review
        </h1>
        <p className="text-sm text-paper/70">
          We've sent your design to the artist for a quick look before we can
          confirm a price. You'll hear back soon.
        </p>
      </div>
    );
  }

  return <ConsultationBookingStep submissionId={result.submissionId} />;
}

// ---------------------------------------------------------------------------
// Booking — fetches real available slots and lets the client pick one
// ---------------------------------------------------------------------------

function BookingStep({ result }: { result: SubmissionResult }) {
  const [booked, setBooked] = useState<Slot | null>(null);

  if (booked) {
    return (
      <BookedConfirmation
        slot={booked}
        depositAmount={result.deposit.amount}
        depositInstructions={result.deposit.instructions}
      />
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <h1 className="font-display text-3xl leading-tight text-paper">
        Pick a time
      </h1>

      <div className="rounded-sm border border-paper/10 bg-white/[0.02] p-5">
        <p className="text-xs uppercase tracking-wide text-paper/40">Estimated price</p>
        <p className="mt-1 text-2xl text-paper">
          ${result.estimate.priceLow.toFixed(0)}–${result.estimate.priceHigh.toFixed(0)}
        </p>
        <p className="mt-3 text-xs uppercase tracking-wide text-paper/40">Estimated time</p>
        <p className="mt-1 text-paper/80">{result.estimate.hours.toFixed(1)} hours</p>
      </div>

      <SlotBooker submissionId={result.submissionId} type="TATTOO" onBooked={setBooked} />

      <p className="text-xs text-paper/40">
        This is an estimated price based on the information provided — final
        pricing may vary based on the artist's assessment and the final
        design.
      </p>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Consultation booking — RED submissions need to talk it through first
// ---------------------------------------------------------------------------

function ConsultationBookingStep({ submissionId }: { submissionId: string }) {
  const [booked, setBooked] = useState<Slot | null>(null);

  if (booked) {
    return (
      <div className="flex flex-col gap-4">
        <BookedConfirmation slot={booked} />
        <p className="text-xs text-paper/40">
          The artist will talk through the design and placement with you at
          this appointment before giving a final price.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="font-display text-3xl leading-tight text-paper">
          This one needs a consultation
        </h1>
        <p className="mt-2 text-sm text-paper/70">
          The artist will need to talk through the design and placement with
          you before giving an accurate price. Pick a time below.
        </p>
      </div>

      <SlotBooker submissionId={submissionId} type="CONSULTATION" onBooked={setBooked} />
    </div>
  );
}

function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

// ---------------------------------------------------------------------------
// Shared nav
// ---------------------------------------------------------------------------

function StepNav({
  onNext,
  onBack,
  disabled,
  nextLabel = "Continue",
}: {
  onNext: () => void;
  onBack: () => void;
  disabled?: boolean;
  nextLabel?: string;
}) {
  return (
    <div className="flex gap-3">
      <button
        onClick={onBack}
        className="rounded-sm border border-paper/15 px-5 py-3.5 text-sm text-paper/70"
      >
        Back
      </button>
      <button
        onClick={onNext}
        disabled={disabled}
        className="flex-1 rounded-sm bg-ink-red py-3.5 font-medium text-paper transition-opacity disabled:opacity-30"
      >
        {nextLabel}
      </button>
    </div>
  );
}
