import { v } from "convex/values";
import { serverMutation } from "./guard";

// A sliding-window limiter shared by every server instance (forms, login).
// Runs as one mutation, so concurrent attempts can't both slip through.

export const hit = serverMutation({
  args: { key: v.string(), limit: v.number(), windowMs: v.number() },
  handler: async (ctx, { key, limit, windowMs }) => {
    const now = Date.now();
    const doc = await ctx.db
      .query("rateLimits")
      .withIndex("by_key", (q) => q.eq("key", key))
      .unique();
    const recent = (doc?.hits ?? []).filter((time) => now - time < windowMs);
    const allowed = recent.length < limit;
    const hits = allowed ? [...recent, now] : recent;

    const lastHit = hits.at(-1);
    if (doc) await ctx.db.patch(doc._id, { hits, lastHit });
    else await ctx.db.insert("rateLimits", { key, hits, lastHit });
    return allowed;
  },
});

/** Clears a key, e.g. to unlock admin sign-in from the CLI after a lockout. */
export const reset = serverMutation({
  args: { key: v.string() },
  handler: async (ctx, { key }) => {
    const doc = await ctx.db
      .query("rateLimits")
      .withIndex("by_key", (q) => q.eq("key", key))
      .unique();
    if (doc) await ctx.db.delete(doc._id);
  },
});
