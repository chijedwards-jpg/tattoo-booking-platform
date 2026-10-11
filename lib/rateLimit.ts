import { NextRequest } from "next/server";

/**
 * In-memory sliding-window rate limiter, keyed per process. Fine for a
 * single server instance (what this app runs as today); if this ever runs
 * as multiple instances behind a load balancer, each instance tracks its
 * own counts, so the effective limit becomes (limit * instance count) —
 * swap for a shared store (e.g. Upstash Redis) before scaling horizontally.
 */
const hits = new Map<string, number[]>();

export function checkRateLimit(key: string, limit: number, windowMs: number): boolean {
  const now = Date.now();
  const timestamps = (hits.get(key) ?? []).filter((t) => now - t < windowMs);

  if (timestamps.length >= limit) {
    hits.set(key, timestamps);
    return false;
  }

  timestamps.push(now);
  hits.set(key, timestamps);

  // Opportunistic cleanup so this map doesn't grow unbounded over the
  // process's lifetime — cheap relative to how rarely it runs.
  if (hits.size > 5000) {
    for (const [k, v] of hits) {
      if (v.every((t) => now - t > windowMs)) hits.delete(k);
    }
  }

  return true;
}

export function getClientIp(req: NextRequest): string {
  return (
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    req.headers.get("x-real-ip") ??
    "unknown"
  );
}
