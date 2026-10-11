// A small in-memory sliding-window rate limiter. It lives in one server
// process, which fits a single-server deployment; with several instances or
// serverless hosting, move it to a shared store (see the hosting decision).

const hits = new Map<string, number[]>();
const MAX_KEYS = 10_000;

type Options = { limit: number; windowMs: number; now?: number };

/** Records one attempt for `key`; returns false once the limit is reached. */
export function rateLimit(
  key: string,
  { limit, windowMs, now = Date.now() }: Options,
): boolean {
  const recent = (hits.get(key) ?? []).filter((time) => now - time < windowMs);

  if (recent.length >= limit) {
    hits.set(key, recent);
    return false;
  }

  // Keep memory bounded if something floods the limiter with new keys.
  if (!hits.has(key) && hits.size >= MAX_KEYS) hits.clear();
  recent.push(now);
  hits.set(key, recent);
  return true;
}

/** For tests. */
export function resetRateLimits() {
  hits.clear();
}
