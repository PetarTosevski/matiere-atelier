import { ConvexError, v } from "convex/values";
import { serverMutation, serverQuery } from "./guard";
import { deleteFilesIfPresent } from "./storage";

/** A short-lived URL the Next.js server POSTs a processed image to. */
export const generateUploadUrl = serverMutation({
  args: {},
  handler: async (ctx) => ctx.storage.generateUploadUrl(),
});

/** The public URL of a stored file, for previews in the admin form. */
export const getUrl = serverQuery({
  args: { storageId: v.id("_storage") },
  handler: async (ctx, { storageId }) => ctx.storage.getUrl(storageId),
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
