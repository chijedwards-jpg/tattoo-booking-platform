// Shared between the client intake form (app/page.tsx) and the artist's
// restriction settings — a placement restriction only actually blocks
// auto-booking (see decideRouting in pricingEngine.ts) if its value matches
// one of these exactly, so both sides must draw from the same list.

export type Placement =
  | "forearm" | "upper_arm" | "bicep" | "shoulder" | "wrist" | "hand" | "chest" | "stomach" | "back"
  | "ribs" | "hip" | "thigh" | "calf" | "shin" | "ankle" | "foot" | "neck" | "other";

export const PLACEMENTS: { value: Placement; label: string }[] = [
  { value: "forearm", label: "Forearm" },
  { value: "upper_arm", label: "Upper arm" },
  { value: "bicep", label: "Bicep" },
  { value: "shoulder", label: "Shoulder" },
  { value: "wrist", label: "Wrist" },
  { value: "hand", label: "Hand" },
  { value: "chest", label: "Chest" },
  { value: "stomach", label: "Stomach" },
  { value: "back", label: "Back" },
  { value: "ribs", label: "Ribs" },
  { value: "hip", label: "Hip" },
  { value: "thigh", label: "Thigh" },
  { value: "calf", label: "Calf" },
  { value: "shin", label: "Shin" },
  { value: "ankle", label: "Ankle" },
  { value: "foot", label: "Foot" },
  { value: "neck", label: "Neck" },
  { value: "other", label: "Other" },
];

/** Display name for a stored placement value ("upper_arm" → "Upper arm"). */
export function placementLabel(value: string | null | undefined): string {
  if (!value) return "—";
  return PLACEMENTS.find((p) => p.value === value)?.label ?? value.charAt(0).toUpperCase() + value.slice(1).replace(/_/g, " ");
}

const SIZE_LABELS: Record<string, string> = {
  coin: "Coin-sized (~1–2 in)",
  palm: "Palm-sized (~3–4 in)",
  phone: "Phone-sized (~5–6 in)",
  hand: "Hand-sized (~7–9 in)",
  larger: "Larger",
};

/** Display text for a request's size — the preset plus any inches typed. */
export function sizeLabel(preset: string | null | undefined, inches: number | null | undefined): string {
  const base = preset ? SIZE_LABELS[preset] ?? preset : null;
  const typed = inches != null ? `${inches} in` : null;
  if (base && typed) return `${base}, ${typed}`;
  return base ?? typed ?? "—";
}
