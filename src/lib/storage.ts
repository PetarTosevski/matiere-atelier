import "server-only";
import { api, convexMutation, convexQuery } from "@/lib/convex";

// File storage behind a small interface, so Convex storage can be swapped for
// S3 or R2 later without touching the admin code.

export async function storeFile(data: Uint8Array, contentType: string): Promise<string> {
  const uploadUrl = await convexMutation(api.files.generateUploadUrl, {});
  const response = await fetch(uploadUrl, {
    method: "POST",
    headers: { "Content-Type": contentType },
    body: new Blob([data as BlobPart], { type: contentType }),
  });
  if (!response.ok) throw new Error(`Upload failed with status ${response.status}`);
  const { storageId } = (await response.json()) as { storageId: string };
  return storageId;
}

export async function fileUrl(storageId: string): Promise<string | null> {
  return convexQuery(api.files.getUrl, { storageId: storageId as never });
}

/** Deletes uploads that never made it into a saved artwork. */
export async function discardFiles(storageIds: string[]): Promise<void> {
  if (storageIds.length === 0) return;
  await convexMutation(api.files.discard, { storageIds: storageIds as never });
}
