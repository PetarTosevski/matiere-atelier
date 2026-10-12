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

/**
 * The admin's own customer account (email = ADMIN_USERNAME), made on first
 * admin sign-in. Its password hash is never used: the admin password is.
 */
export const ensure = serverMutation({
  args: { email: v.string(), firstName: v.string(), passwordHash: v.string() },
  handler: async (ctx, { email, firstName, passwordHash }) => {
    let doc = await ctx.db.query("customers").withIndex("by_email", (q) => q.eq("email", email)).unique();
    if (!doc) {
      const id = await ctx.db.insert("customers", {
        email,
        firstName,
        lastName: "",
        passwordHash,
        newsletter: false,
        sessionVersion: 1,
        createdAt: new Date().toISOString(),
      });
      doc = (await ctx.db.get(id))!;
    }
    return {
      id: doc._id,
      email: doc.email,
      firstName: doc.firstName,
      lastName: doc.lastName,
      sessionVersion: doc.sessionVersion,
    };
  },
});

/** Signs out every session of an account (after the admin password changes). Returns the new version. */
export const endSessions = serverMutation({
  args: { email: v.string() },
  handler: async (ctx, { email }) => {
    const doc = await ctx.db.query("customers").withIndex("by_email", (q) => q.eq("email", email)).unique();
    if (!doc) return null;
    const sessionVersion = doc.sessionVersion + 1;
    await ctx.db.patch(doc._id, { sessionVersion });
    return sessionVersion;
  },
});

/**
 * Deletes an account (the customer's own choice, GDPR). Its reset links go
 * too. Orders and messages it sent stay with the artist as correspondence,
 * but are no longer linked to anyone's account. Returns false if already gone.
 */
export const remove = serverMutation({
  args: { id: v.id("customers") },
  handler: async (ctx, { id }) => {
    const doc = await ctx.db.get(id);
    if (!doc) return false;
    const resets = await ctx.db
      .query("passwordResets")
      .withIndex("by_subject", (q) => q.eq("subject", `customer:${id}`))
      .collect();
    for (const reset of resets) await ctx.db.delete(reset._id);
    const inquiries = await ctx.db
      .query("inquiries")
      .withIndex("by_customer", (q) => q.eq("customerId", id))
      .collect();
    for (const inquiry of inquiries) await ctx.db.patch(inquiry._id, { customerId: undefined });
    await ctx.db.delete(id);
    return true;
  },
});
