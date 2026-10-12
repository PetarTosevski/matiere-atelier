import "server-only";
import { api, convexMutation, convexQuery } from "@/lib/convex";

// File storage behind a small interface, so Convex storage can be swapped for
// S3 or R2 later without touching the admin code.

/** A one-time URL that accepts a single file POSTed to it. */
export function createUploadUrl(): Promise<string> {
  return convexMutation(api.files.generateUploadUrl, {});
}

export async function storeFile(data: Uint8Array, contentType: string): Promise<string> {
  const uploadUrl = await createUploadUrl();
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

/** Size in bytes, or null if the file does not exist. */
export async function fileSize(storageId: string): Promise<number | null> {
  return convexQuery(api.files.getSize, { storageId: storageId as never });
}

/** The file's contents, or null if it does not exist. */
export async function readFile(storageId: string): Promise<Uint8Array | null> {
  const url = await fileUrl(storageId);
  if (!url) return null;
  const response = await fetch(url, { cache: "no-store" });
  if (!response.ok) throw new Error(`Download failed with status ${response.status}`);
  return new Uint8Array(await response.arrayBuffer());
}

/** Deletes uploads that never made it into a saved artwork. */
export async function discardFiles(storageIds: string[]): Promise<void> {
  if (storageIds.length === 0) return;
  await convexMutation(api.files.discard, { storageIds: storageIds as never });
}
