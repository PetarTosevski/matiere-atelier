import { v } from "convex/values";
import { serverMutation, serverQuery } from "./guard";

// Collector accounts. Next.js validates input and hashes passwords; these
// functions only store and look up. Emails are lowercased by the caller.

/** For sign-in only: includes the password hash. */
export const getByEmail = serverQuery({
  args: { email: v.string() },
  handler: async (ctx, { email }) =>
    ctx.db.query("customers").withIndex("by_email", (q) => q.eq("email", email)).unique(),
});

/** The account as the account page shows it (no password hash). */
export const get = serverQuery({
  args: { id: v.id("customers") },
  handler: async (ctx, { id }) => {
    const doc = await ctx.db.get(id);
    if (!doc) return null;
    return {
      id: doc._id,
      email: doc.email,
      firstName: doc.firstName,
      lastName: doc.lastName,
      newsletter: doc.newsletter,
      sessionVersion: doc.sessionVersion,
    };
  },
});

/** For "Change password": checks the current one in Next.js. */
export const getPasswordHash = serverQuery({
  args: { id: v.id("customers") },
  handler: async (ctx, { id }) => (await ctx.db.get(id))?.passwordHash ?? null,
});

/** Returns null when the email already has an account. */
export const create = serverMutation({
  args: { email: v.string(), firstName: v.string(), passwordHash: v.string(), newsletter: v.boolean() },
  handler: async (ctx, account) => {
    const existing = await ctx.db
      .query("customers")
      .withIndex("by_email", (q) => q.eq("email", account.email))
      .unique();
    if (existing) return null;
    return ctx.db.insert("customers", {
      ...account,
      lastName: "",
      sessionVersion: 1,
      createdAt: new Date().toISOString(),
    });
  },
});

export const updateDetails = serverMutation({
  args: { id: v.id("customers"), firstName: v.string(), lastName: v.string(), newsletter: v.boolean() },
  handler: async (ctx, { id, ...details }) => {
    await ctx.db.patch(id, details);
  },
});

/** Sets a new password and signs out every other session. Returns the new version. */
export const setPassword = serverMutation({
  args: { id: v.id("customers"), passwordHash: v.string() },
  handler: async (ctx, { id, passwordHash }) => {
    const doc = await ctx.db.get(id);
    if (!doc) return null;
    const sessionVersion = doc.sessionVersion + 1;
    await ctx.db.patch(id, { passwordHash, sessionVersion });
    return sessionVersion;
  },
});
