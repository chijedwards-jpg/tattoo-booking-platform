"use client";

import { useState } from "react";
import {
  Upload, MapPin, Ruler, Sparkles, ArrowRight, ChevronLeft, ChevronRight, Plus,
} from "lucide-react";
import { SlotBooker, BookedConfirmation, type Slot } from "../../SlotBooker";
import { PLACEMENTS, type Placement } from "@/lib/placements";
import { Badge, PrimaryButton, GhostButton, Chip, Card, StepDots } from "../../ui";

const SIZE_PRESETS = [
  { value: "coin", label: "Coin-sized", hint: "~1–2 in" },
  { value: "palm", label: "Palm-sized", hint: "~3–4 in" },
  { value: "phone", label: "Phone-sized", hint: "~5–6 in" },
  { value: "hand", label: "Hand-sized", hint: "~7–9 in" },
  { value: "larger", label: "Larger", hint: "custom" },
];

const STEP_KEYS = ["welcome", "upload", "reference", "placement", "size", "detail", "analyzing", "result"] as const;
type StepKey = (typeof STEP_KEYS)[number];

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
  artistBio,
}: {
  artistSlug: string;
  artistName: string;
  artistBio: string | null;
}) {
  const [stepIndex, setStepIndex] = useState(0);
  const step = STEP_KEYS[stepIndex];

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
    setStepIndex(STEP_KEYS.indexOf("analyzing"));
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
      setStepIndex(STEP_KEYS.indexOf("result"));
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : "Something went wrong.");
      setStepIndex(STEP_KEYS.indexOf("detail"));
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
    setStepIndex((i) => Math.min(i + 1, STEP_KEYS.indexOf("detail")));
  }
  function back() {
    setStepIndex((i) => Math.max(i - 1, STEP_KEYS.indexOf("welcome") + 1));
  }

  return (
    <main className="min-h-screen bg-paper text-ink">
      <div className="mx-auto flex min-h-screen max-w-md flex-col px-5 py-8">
        {step !== "welcome" && step !== "analyzing" && step !== "result" && (
          <div className="mb-8">
            <StepDots count={5} current={stepIndex - 1} />
          </div>
        )}

        <div className="flex-1">
          {step === "welcome" && (
            <WelcomeStep artistName={artistName} artistBio={artistBio} onNext={next} />
          )}

          {step === "upload" && (
            <UploadStep preview={inspirationPreview} onUpload={handleUpload} onNext={next} onBack={back} />
          )}

          {step === "reference" && (
            <FreedomStep freedom={freedom} setFreedom={setFreedom} onNext={next} onBack={back} />
          )}

          {step === "placement" && (
            <PlacementStep placement={placement} setPlacement={setPlacement} onNext={next} onBack={back} />
          )}

          {step === "size" && (
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

          {step === "detail" && (
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

          {step === "analyzing" && (
            <div className="py-24 text-center">
              <Sparkles className="mx-auto animate-pulse text-ink-red" size={26} />
              <p className="mt-4 font-display text-xl">Reading your design…</p>
              <p className="mt-1 text-sm text-grey">Estimating style, complexity, and time.</p>
            </div>
          )}

          {step === "result" && result && <ResultStep result={result} artistName={artistName} />}
        </div>
      </div>
    </main>
  );
}

// ---------------------------------------------------------------------------
// Step 0 — Welcome
// ---------------------------------------------------------------------------

function WelcomeStep({
  artistName,
  artistBio,
  onNext,
}: {
  artistName: string;
  artistBio: string | null;
  onNext: () => void;
}) {
  const initials = artistName
    .split(" ")
    .map((w) => w[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  return (
    <div className="pt-8 text-center">
      <div className="mx-auto mb-5 flex h-20 w-20 items-center justify-center rounded-full bg-ink">
        <span className="font-display text-2xl text-paper">{initials}</span>
      </div>
      <h1 className="font-display text-3xl leading-tight text-ink">{artistName}</h1>
      {artistBio && <p className="mt-4 text-[15px] leading-relaxed text-ink/80">{artistBio}</p>}

      <div className="mt-8">
        <PrimaryButton full onClick={onNext}>
          Start your tattoo <ArrowRight size={16} />
        </PrimaryButton>
        <p className="mt-3 text-xs text-grey">
          Upload → estimate → book. No back-and-forth if it's straightforward.
        </p>
      </div>
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
  onBack,
}: {
  preview: string | null;
  onUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onNext: () => void;
  onBack: () => void;
}) {
  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="font-display text-3xl leading-tight text-ink">
          What are you looking to get tattooed?
        </h1>
        <p className="mt-2 text-sm text-grey">
          Upload a photo, screenshot, or drawing of what you have in mind.
        </p>
      </div>

      <label className="group relative flex aspect-square w-full cursor-pointer flex-col items-center justify-center overflow-hidden rounded-2xl border-2 border-dashed border-line bg-card transition-colors hover:border-ink-red/60">
        {preview ? (
          <img src={preview} alt="Inspiration" className="h-full w-full object-cover" />
        ) : (
          <div className="flex flex-col items-center gap-3 px-8 text-center">
            <Upload size={22} className="text-ink-red" />
            <span className="text-sm text-grey">Tap to upload an image</span>
          </div>
        )}
        <input
          type="file"
          accept="image/jpeg,image/png,image/heic"
          className="hidden"
          onChange={onUpload}
        />
      </label>

      <StepNav onNext={onNext} onBack={onBack} disabled={!preview} />
    </div>
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
        <h1 className="font-display text-3xl leading-tight text-ink">
          How closely should we follow this?
        </h1>
        <p className="mt-2 text-sm text-grey">
          Slide toward the artist's side if you want them to adapt it to your body and their style.
        </p>
      </div>

      <Card>
        <input
          type="range"
          min={0}
          max={100}
          value={freedom}
          onChange={(e) => setFreedom(Number(e.target.value))}
          className="range-slider w-full"
          style={{
            background: `linear-gradient(90deg, #42522F ${freedom}%, #D8CFB8 ${freedom}%)`,
          }}
        />
        <div className="mt-4 flex justify-between font-mono text-[11px] uppercase tracking-wide text-grey">
          <span>Follow the reference</span>
          <span>Artist's interpretation</span>
        </div>
      </Card>
      <p className="-mt-4 text-center text-xs text-grey">{freedom}% toward artist's interpretation</p>

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
        <h1 className="font-display text-3xl leading-tight text-ink">Where do you want it?</h1>
      </div>

      <div className="grid grid-cols-2 gap-2">
        {PLACEMENTS.map((p) => (
          <Chip key={p.value} active={placement === p.value} onClick={() => setPlacement(p.value)}>
            <MapPin size={13} className="-mt-0.5 mr-1.5 inline" />
            {p.label}
          </Chip>
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
        <h1 className="font-display text-3xl leading-tight text-ink">About how big?</h1>
      </div>

      <div className="flex flex-col gap-2">
        {SIZE_PRESETS.map((s) => (
          <Chip key={s.value} active={sizePreset === s.value} onClick={() => setSizePreset(s.value)}>
            <div className="flex w-full items-center justify-between">
              <span className="flex items-center gap-1.5">
                {s.value === "larger" && <Ruler size={13} />}
                {s.label}
              </span>
              <span className="text-xs text-grey">{s.hint}</span>
            </div>
          </Chip>
        ))}
      </div>

      {sizePreset === "larger" && (
        <div className="flex gap-3">
          <div className="flex-1">
            <label className="font-mono text-xs uppercase tracking-wide text-grey">Width (in)</label>
            <input
              type="number"
              value={customWidth}
              onChange={(e) => setCustomWidth(e.target.value)}
              className="mt-1 w-full rounded-lg border border-line bg-card px-3 py-2 text-ink outline-none focus:border-ink-red"
            />
          </div>
          <div className="flex-1">
            <label className="font-mono text-xs uppercase tracking-wide text-grey">Height (in)</label>
            <input
              type="number"
              value={customHeight}
              onChange={(e) => setCustomHeight(e.target.value)}
              className="mt-1 w-full rounded-lg border border-line bg-card px-3 py-2 text-ink outline-none focus:border-ink-red"
            />
          </div>
        </div>
      )}

      <StepNav onNext={onNext} onBack={onBack} disabled={!sizePreset} />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Step 5 — Details + summary (submission happens here)
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
        <h1 className="font-display text-3xl leading-tight text-ink">
          Last thing — where should we send your estimate?
        </h1>
      </div>

      <div>
        <label className="font-mono text-xs uppercase tracking-wide text-grey">Email</label>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@email.com"
          className="mt-1 w-full rounded-xl border border-line bg-card px-4 py-3 text-sm text-ink outline-none placeholder:text-grey/60 focus:border-ink-red"
        />
      </div>

      <div>
        <label className="font-mono text-xs uppercase tracking-wide text-grey">Anything else? (optional)</label>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="e.g. Keep it black and grey, make the lettering a bit bigger…"
          rows={3}
          className="mt-1 w-full rounded-xl border border-line bg-card px-4 py-3 text-sm text-ink outline-none placeholder:text-grey/60 focus:border-ink-red"
        />
      </div>

      <Card>
        <p className="font-mono text-[11px] uppercase tracking-wide text-grey">Summary</p>
        <div className="mt-3 flex gap-3">
          {preview && <img src={preview} className="h-16 w-16 rounded-lg object-cover" />}
          <div className="flex flex-col justify-center gap-1 text-sm text-ink">
            <span>{PLACEMENTS.find((p) => p.value === placement)?.label ?? "—"}</span>
            <span>{SIZE_PRESETS.find((s) => s.value === sizePreset)?.label ?? "—"}</span>
            <span>{freedom}% artist's interpretation</span>
          </div>
        </div>
      </Card>

      {submitError && (
        <p className="rounded-xl border border-ink-red/40 bg-ink-red/10 px-4 py-3 text-sm text-ink">
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

function ResultStep({ result, artistName }: { result: SubmissionResult; artistName: string }) {
  const firstName = artistName.split(" ")[0];

  if (result.status === "GREEN_AUTO_BOOKABLE") {
    return <BookingStep result={result} />;
  }

  if (result.status === "YELLOW_ARTIST_REVIEW") {
    return (
      <div className="flex flex-col gap-4">
        <Badge tone="yellow">Needs artist review</Badge>
        <h1 className="font-display text-3xl leading-tight text-ink">
          Your tattoo needs a quick review
        </h1>
        <p className="text-sm text-grey">
          We've sent your design to {firstName} for a quick look before we can
          confirm a price. You'll hear back by email.
        </p>
      </div>
    );
  }

  return <ConsultationBookingStep submissionId={result.submissionId} artistFirstName={firstName} />;
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
        title="Tattoo appointment"
        depositAmount={result.deposit.amount}
        depositInstructions={result.deposit.instructions}
      />
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="font-display text-2xl leading-tight text-ink">Your estimate</h1>
        <Badge tone="green">Auto-bookable</Badge>
      </div>

      <Card>
        <p className="font-mono text-[11px] uppercase tracking-wide text-grey">Estimated price</p>
        <p className="mt-1 font-display text-2xl text-ink">
          ${result.estimate.priceLow.toFixed(0)}–${result.estimate.priceHigh.toFixed(0)}
        </p>
        <p className="mt-3 font-mono text-[11px] uppercase tracking-wide text-grey">Estimated time</p>
        <p className="mt-1 text-ink">{result.estimate.hours.toFixed(1)} hours</p>
      </Card>

      <div>
        <h3 className="mb-2 font-display text-xl text-ink">Pick a time</h3>
        <SlotBooker submissionId={result.submissionId} type="TATTOO" onBooked={setBooked} />
      </div>

      <p className="text-xs text-grey">
        Picking a time reserves the slot. This is an estimated price based on
        the information provided — final pricing may vary based on the
        artist's assessment and the final design.
      </p>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Consultation booking — RED submissions need to talk it through first
// ---------------------------------------------------------------------------

function ConsultationBookingStep({
  submissionId,
  artistFirstName,
}: {
  submissionId: string;
  artistFirstName: string;
}) {
  const [booked, setBooked] = useState<Slot | null>(null);

  if (booked) {
    return <BookedConfirmation slot={booked} title="Consultation" />;
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-3">
        <Badge tone="red">Consultation required</Badge>
        <h1 className="font-display text-3xl leading-tight text-ink">
          This one needs a consultation
        </h1>
        <p className="text-sm text-grey">
          {artistFirstName} will need to talk through the design and
          placement with you before giving an accurate price. Pick a time
          below.
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
      <GhostButton onClick={onBack}>
        <ChevronLeft size={15} /> Back
      </GhostButton>
      <PrimaryButton onClick={onNext} disabled={disabled} full className="flex-1">
        {nextLabel} <ChevronRight size={15} />
      </PrimaryButton>
    </div>
  );
}
