import { v } from "convex/values";
import { serverMutation, serverQuery } from "./guard";
import { storedImageValidator } from "./schema";
import { deleteFilesIfPresent } from "./storage";

// Content for pages the artist edits herself. Today that is the About page;
// its heading stays in messages/en.json like the rest of the interface copy.

/** The About page content, or null if it has never been saved. */
export const getAbout = serverQuery({
  args: {},
  handler: async (ctx) => {
    const doc = await ctx.db.query("aboutPage").first();
    if (!doc) return null;
    const portrait = doc.portrait
      ? { ...doc.portrait, src: await ctx.storage.getUrl(doc.portrait.storageId) }
      : null;
    return {
      bio: doc.bio,
      portrait: portrait?.src ? { ...portrait, src: portrait.src } : null,
    };
  },
});

/** Saves the About page; deletes the old portrait file when it is replaced. */
export const setAbout = serverMutation({
  args: { bio: v.string(), portrait: v.union(storedImageValidator, v.null()) },
  handler: async (ctx, content) => {
    const doc = await ctx.db.query("aboutPage").first();
    const previous = doc?.portrait?.storageId ?? null;
    if (doc) await ctx.db.patch(doc._id, content);
    else await ctx.db.insert("aboutPage", content);
    if (previous && previous !== content.portrait?.storageId) {
      await deleteFilesIfPresent(ctx, [previous]);
    }
  },
});
