/** Plain logic with no server imports, shared by pages, routes, and tests. */
export function isFlashBookable(design: {
  active: boolean;
  oneOff: boolean;
  claimedAt: Date | string | null;
}): boolean {
  return design.active && !(design.oneOff && design.claimedAt);
}

export function formatFlashDuration(durationMins: number): string {
  const hours = durationMins / 60;
  return `${Number.isInteger(hours) ? hours : hours.toFixed(1)} hr${hours === 1 ? "" : "s"}`;
}
