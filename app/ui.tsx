import { CheckCircle2, AlertTriangle, XCircle, Circle } from "lucide-react";
import type { ReactNode } from "react";

// ---------------------------------------------------------------------------
// Badge — colored status pill with icon
// ---------------------------------------------------------------------------

export type BadgeTone = "green" | "yellow" | "red" | "neutral";

const TONE_STYLE: Record<BadgeTone, { color: string; bg: string; border: string; Icon: typeof CheckCircle2 }> = {
  green: { color: "text-pine", bg: "bg-pine/10", border: "border-pine/40", Icon: CheckCircle2 },
  yellow: { color: "text-ochre", bg: "bg-ochre/10", border: "border-ochre/40", Icon: AlertTriangle },
  red: { color: "text-ink-red", bg: "bg-ink-red/10", border: "border-ink-red/40", Icon: XCircle },
  neutral: { color: "text-grey", bg: "bg-grey/10", border: "border-grey/30", Icon: Circle },
};

export function Badge({ tone, children }: { tone: BadgeTone; children: ReactNode }) {
  const s = TONE_STYLE[tone];
  return (
    <span
      className={`inline-flex shrink-0 items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-mono uppercase tracking-wide ${s.color} ${s.bg} ${s.border}`}
    >
      <s.Icon size={12} /> {children}
    </span>
  );
}

// ---------------------------------------------------------------------------
// Buttons
// ---------------------------------------------------------------------------

export function PrimaryButton({
  children,
  onClick,
  disabled,
  full,
  type = "button",
  className = "",
}: {
  children: ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  full?: boolean;
  type?: "button" | "submit";
  className?: string;
}) {
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`inline-flex items-center justify-center gap-2 rounded-full bg-ink-red px-5 py-3 text-sm font-medium text-paper transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40 ${full ? "w-full" : ""} ${className}`}
    >
      {children}
    </button>
  );
}

export function GhostButton({
  children,
  onClick,
  disabled,
  type = "button",
  className = "",
}: {
  children: ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  type?: "button" | "submit";
  className?: string;
}) {
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`inline-flex items-center justify-center gap-2 rounded-full border border-ink px-4 py-2.5 text-sm text-ink transition-colors hover:bg-ink/5 disabled:cursor-not-allowed disabled:opacity-40 ${className}`}
    >
      {children}
    </button>
  );
}

// ---------------------------------------------------------------------------
// Chip — pill-shaped toggle, used for placements/styles/day selectors
// ---------------------------------------------------------------------------

export function Chip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-full border px-3 py-2 text-left text-sm transition-colors ${
        active ? "border-ink bg-ink text-paper" : "border-line bg-transparent text-ink hover:border-ink/40"
      }`}
    >
      {children}
    </button>
  );
}

// ---------------------------------------------------------------------------
// Card — the rounded, bordered content block used everywhere
// ---------------------------------------------------------------------------

export function Card({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <div className={`rounded-2xl border border-line bg-card p-5 ${className}`}>
      {children}
    </div>
  );
}

// ---------------------------------------------------------------------------
// StepDots — the needle-and-thread progress indicator for the intake flow
// ---------------------------------------------------------------------------

export function StepDots({ count, current }: { count: number; current: number }) {
  return (
    <div className="flex items-center gap-1">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="flex flex-1 items-center gap-1 last:flex-none">
          <div
            className={`h-2.5 w-2.5 shrink-0 rounded-full border transition-all ${
              i === current ? "scale-125 border-ink-red bg-ink-red" : i < current ? "border-ink bg-ink" : "border-line bg-transparent"
            }`}
          />
          {i < count - 1 && (
            <div className={`h-px flex-1 border-t border-dashed ${i < current ? "border-ink" : "border-line"}`} />
          )}
        </div>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Field — labeled form field wrapper
// ---------------------------------------------------------------------------

export function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <div>
      <label className="font-mono text-[11px] uppercase tracking-wide text-grey">{label}</label>
      <div className="mt-1">{children}</div>
      {hint && <p className="mt-1 text-xs text-grey">{hint}</p>}
    </div>
  );
}

export function inputClass(extra = "") {
  return `w-full rounded-lg border border-line bg-paper px-3 py-2.5 text-sm text-ink outline-none focus:border-ink-red ${extra}`;
}

// ---------------------------------------------------------------------------
// StatCard — dashboard overview metric tile
// ---------------------------------------------------------------------------

export function StatCard({ label, value, sub }: { label: string; value: string | number; sub?: string }) {
  return (
    <Card>
      <p className="font-mono text-[11px] uppercase tracking-wide text-grey">{label}</p>
      <p className="mt-1 font-display text-3xl text-ink">{value}</p>
      {sub && <p className="mt-1 text-xs text-grey">{sub}</p>}
    </Card>
  );
}
