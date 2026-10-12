import { v } from "convex/values";
import { serverMutation, serverQuery } from "./guard";

// One-time reset links for the admin and for customers. Next.js makes the
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
