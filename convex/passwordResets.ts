import { v } from "convex/values";
import { serverMutation, serverQuery } from "./guard";

// One-time reset links for the admin and for customers, and the admin's
// emailed sign-in code (subject "admin-code"). Next.js makes the
// token and passes only its SHA-256 here, so a database leak can't be used to
// reset anyone's password.

/** Stores a new link for `subject`, replacing any earlier one. */
export const create = serverMutation({
  args: { tokenHash: v.string(), subject: v.string(), expiresAt: v.number() },
  handler: async (ctx, reset) => {
    const earlier = await ctx.db
      .query("passwordResets")
      .withIndex("by_subject", (q) => q.eq("subject", reset.subject))
      .collect();
    for (const doc of earlier) await ctx.db.delete(doc._id);
    await ctx.db.insert("passwordResets", reset);
  },
});

/** Whether a link is still valid, without using it up (for the reset page). */
export const check = serverQuery({
  args: { tokenHash: v.string() },
  handler: async (ctx, { tokenHash }) => {
    const doc = await ctx.db
      .query("passwordResets")
      .withIndex("by_token", (q) => q.eq("tokenHash", tokenHash))
      .unique();
    return doc !== null && doc.expiresAt > Date.now() ? doc.subject : null;
  },
});

/** Uses up a link. Returns its subject, or null when unknown or expired. */
export const consume = serverMutation({
  args: { tokenHash: v.string() },
  handler: async (ctx, { tokenHash }) => {
    const doc = await ctx.db
      .query("passwordResets")
      .withIndex("by_token", (q) => q.eq("tokenHash", tokenHash))
      .unique();
    if (!doc) return null;
    await ctx.db.delete(doc._id);
    return doc.expiresAt > Date.now() ? doc.subject : null;
  },
});

/**
 * Checks a sign-in code for `subject` (one per subject; `create` replaces it).
 * The code is used up when it matches, and after `maxAttempts` wrong guesses,
 * so it can't be guessed in the minutes it is valid.
 */
export const checkCode = serverMutation({
  args: { subject: v.string(), tokenHash: v.string(), maxAttempts: v.number() },
  handler: async (ctx, { subject, tokenHash, maxAttempts }): Promise<"ok" | "wrong" | "expired"> => {
    const doc = await ctx.db
      .query("passwordResets")
      .withIndex("by_subject", (q) => q.eq("subject", subject))
      .first();
    if (!doc || doc.expiresAt <= Date.now()) {
      if (doc) await ctx.db.delete(doc._id);
      return "expired";
    }
    if (doc.tokenHash === tokenHash) {
      await ctx.db.delete(doc._id);
      return "ok";
    }
    const attempts = (doc.attempts ?? 0) + 1;
    if (attempts >= maxAttempts) {
      await ctx.db.delete(doc._id);
      return "expired";
    }
    await ctx.db.patch(doc._id, { attempts });
    return "wrong";
  },
});
