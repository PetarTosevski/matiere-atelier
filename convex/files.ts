import { ConvexError, v } from "convex/values";
import { serverMutation, serverQuery } from "./guard";
import { deleteFilesIfPresent } from "./storage";

/**
 * A short-lived URL a file can be POSTed to: the processed WebP from the
 * Next.js server, or an admin's original photo straight from the browser
 * (Next.js hands that URL out only after checking the admin session).
 */
export const generateUploadUrl = serverMutation({
  args: {},
  handler: async (ctx) => ctx.storage.generateUploadUrl(),
});

/** The public URL of a stored file, for previews in the admin form. */
export const getUrl = serverQuery({
  args: { storageId: v.id("_storage") },
  handler: async (ctx, { storageId }) => ctx.storage.getUrl(storageId),
});

/** Size in bytes of a stored file, or null if there is no such file. */
export const getSize = serverQuery({
  args: { storageId: v.id("_storage") },
  handler: async (ctx, { storageId }) => (await ctx.db.system.get(storageId))?.size ?? null,
});

/**
 * Deletes uploads that were removed from the form before it was saved.
 * Refuses any file a saved artwork or the About page still uses.
 */
export const discard = serverMutation({
  args: { storageIds: v.array(v.id("_storage")) },
  handler: async (ctx, { storageIds }) => {
    const inUse = new Set<string>();
    for (const artwork of await ctx.db.query("artworks").collect()) {
      for (const image of artwork.images) inUse.add(image.storageId);
    }
    const about = await ctx.db.query("aboutPage").first();
    if (about?.portrait) inUse.add(about.portrait.storageId);
    for (const id of storageIds) {
      if (inUse.has(id)) throw new ConvexError("file is used by an artwork");
    }
    await deleteFilesIfPresent(ctx, storageIds);
  },
});
