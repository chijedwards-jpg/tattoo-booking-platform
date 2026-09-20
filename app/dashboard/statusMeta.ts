import type { BadgeTone } from "../ui";

export const STATUS_META: Record<string, { label: string; tone: BadgeTone }> = {
  PENDING_ANALYSIS: { label: "Analyzing…", tone: "neutral" },
  GREEN_AUTO_BOOKABLE: { label: "Auto-bookable", tone: "green" },
  YELLOW_ARTIST_REVIEW: { label: "Needs review", tone: "yellow" },
  RED_CONSULTATION_REQUIRED: { label: "Needs consultation", tone: "red" },
  APPROVED: { label: "Approved", tone: "green" },
  DECLINED: { label: "Declined", tone: "neutral" },
  BOOKED: { label: "Booked", tone: "green" },
};
