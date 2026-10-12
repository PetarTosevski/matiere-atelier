import { v } from "convex/values";
import { serverMutation, serverQuery } from "./guard";

// The admin password after a reset from the site. Until the first reset this
// document doesn't exist and Next.js uses ADMIN_PASSWORD_HASH from the env.

export const get = serverQuery({
  args: {},
  handler: async (ctx) => {
    const doc = await ctx.db.query("adminCredentials").first();
    return doc ? { passwordHash: doc.passwordHash, sessionVersion: doc.sessionVersion } : null;
  },
});

/** Sets a new password and signs out every admin session. Returns the new version. */
export const setPassword = serverMutation({
  args: { passwordHash: v.string() },
  handler: async (ctx, { passwordHash }) => {
    const doc = await ctx.db.query("adminCredentials").first();
    const sessionVersion = (doc?.sessionVersion ?? 0) + 1;
    if (doc) await ctx.db.patch(doc._id, { passwordHash, sessionVersion });
    else await ctx.db.insert("adminCredentials", { passwordHash, sessionVersion });
    return sessionVersion;
  },
});

/** Goes back to ADMIN_PASSWORD_HASH from the env (run from the CLI with the secret). */
export const clear = serverMutation({
  args: {},
  handler: async (ctx) => {
    const doc = await ctx.db.query("adminCredentials").first();
    if (doc) await ctx.db.delete(doc._id);
  },
});
