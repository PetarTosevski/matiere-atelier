import type { Id } from "./_generated/dataModel";
import type { MutationCtx } from "./_generated/server";

/**
 * Deletes stored files, skipping any that are already gone, so a cleanup
 * never fails a save because of an earlier partial delete.
 */
export async function deleteFilesIfPresent(ctx: MutationCtx, storageIds: Id<"_storage">[]) {
  for (const id of new Set(storageIds)) {
    if (await ctx.db.system.get(id)) await ctx.storage.delete(id);
  }
}
