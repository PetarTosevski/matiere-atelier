import { internal } from "./_generated/api";
import { internalMutation } from "./_generated/server";

// Rows that only pile up: used or expired reset links and sign-in codes, and
// rate-limit counters for IPs that stopped visiting. Internal, so it can't be
// called from outside; the cron in crons.ts starts it.

const BATCH = 200;
/** Longer than the longest rate-limit window (one hour), so no live count is lost. */
const RATE_LIMIT_IDLE_MS = 24 * 60 * 60 * 1000;

export const expiredRows = internalMutation({
  args: {},
  handler: async (ctx) => {
    const now = Date.now();

    const resets = await ctx.db
      .query("passwordResets")
      .withIndex("by_expiresAt", (q) => q.lt("expiresAt", now))
      .take(BATCH);
    for (const doc of resets) await ctx.db.delete(doc._id);

    // Rows from before lastHit existed sort first in the index (undefined), so they go too.
    const limits = await ctx.db
      .query("rateLimits")
      .withIndex("by_lastHit", (q) => q.lt("lastHit", now - RATE_LIMIT_IDLE_MS))
      .take(BATCH);
    for (const doc of limits) await ctx.db.delete(doc._id);

    // More left: carry on in a fresh transaction.
    if (resets.length === BATCH || limits.length === BATCH) {
      await ctx.scheduler.runAfter(0, internal.cleanup.expiredRows, {});
    }
  },
});
