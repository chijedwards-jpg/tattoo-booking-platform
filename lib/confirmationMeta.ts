// Kept apart from lib/clients.ts (which imports the database) so client
// components can use it too.
export const CONFIRMATION_META = {
  PENDING: { label: "Not confirmed yet", tone: "neutral" },
  CONFIRMED: { label: "Confirmed", tone: "green" },
  RESCHEDULE_REQUESTED: { label: "Wants to reschedule", tone: "yellow" },
} as const;
