// Shared between the client intake form (app/page.tsx) and the artist's
// restriction settings — a placement restriction only actually blocks
// auto-booking (see decideRouting in pricingEngine.ts) if its value matches
// one of these exactly, so both sides must draw from the same list.

export type Placement =
  | "forearm" | "upper_arm" | "bicep" | "shoulder" | "chest" | "back"
  | "ribs" | "thigh" | "calf" | "shin" | "ankle" | "hand" | "foot" | "neck" | "other";

export const PLACEMENTS: { value: Placement; label: string }[] = [
  { value: "forearm", label: "Forearm" },
  { value: "upper_arm", label: "Upper arm" },
  { value: "bicep", label: "Bicep" },
  { value: "shoulder", label: "Shoulder" },
  { value: "chest", label: "Chest" },
  { value: "back", label: "Back" },
  { value: "ribs", label: "Ribs" },
  { value: "thigh", label: "Thigh" },
  { value: "calf", label: "Calf" },
  { value: "shin", label: "Shin" },
  { value: "ankle", label: "Ankle" },
  { value: "hand", label: "Hand" },
  { value: "foot", label: "Foot" },
  { value: "neck", label: "Neck" },
  { value: "other", label: "Other" },
];
