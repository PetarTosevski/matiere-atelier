import { v } from "convex/values";
import { serverMutation, serverQuery } from "./guard";

// Site-wide settings live in a single document. The "Show prices" switch only
// ever writes here; it never touches artworks (see CLAUDE.md price rules).

const DEFAULTS = { showPrices: true, currency: "EUR", theme: "dark" as const };

export const get = serverQuery({
  args: {},
  handler: async (ctx) => {
    const doc = await ctx.db.query("siteSettings").first();
    return {
      showPrices: doc?.showPrices ?? DEFAULTS.showPrices,
      currency: doc?.currency ?? DEFAULTS.currency,
      theme: doc?.theme ?? DEFAULTS.theme,
    };
  },
});

export const setShowPrices = serverMutation({
  args: { showPrices: v.boolean() },
  handler: async (ctx, { showPrices }) => {
    const doc = await ctx.db.query("siteSettings").first();
    if (doc) await ctx.db.patch(doc._id, { showPrices });
    else await ctx.db.insert("siteSettings", { showPrices });
  },
});
