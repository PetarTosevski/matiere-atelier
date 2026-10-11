import "server-only";
import { api, convexMutation, isConvexConfigured } from "@/lib/convex";

// Per-key sliding-window limits for forms and login. Stored in Convex so they
// hold across server instances and serverless hosts; in development without
// Convex, an in-memory map stands in.

const hits = new Map<string, number[]>();
const MAX_KEYS = 10_000;

type Options = { limit: number; windowMs: number; now?: number };

/** Records one attempt for `key`; resolves false once the limit is reached. */
export async function rateLimit(key: string, options: Options): Promise<boolean> {
  if (isConvexConfigured()) {
    return convexMutation(api.rateLimits.hit, {
      key,
      limit: options.limit,
      windowMs: options.windowMs,
    });
  }
  return rateLimitInMemory(key, options);
}

export function rateLimitInMemory(
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
