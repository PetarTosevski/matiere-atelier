import type { EditorImage } from "@/lib/collection-changes";

export type UploadProblem = "tooLarge" | "heic" | "unsupported" | "unreadable" | "unauthorized" | "failed";

const MAX_BYTES = 20 * 1024 * 1024;

/**
 * Uploads one image in three steps, so the photo itself never passes through
 * the Next.js server: get a one-time Convex upload URL, send the original
 * there, then have the server process it with sharp into the stored WebP.
 */
export async function uploadImage(
  file: File,
): Promise<{ ok: true; image: EditorImage } | { ok: false; error: UploadProblem }> {
  if (file.size > MAX_BYTES) return { ok: false, error: "tooLarge" };
  try {
    const started = (await (await fetch("/admin/upload", { method: "POST" })).json()) as
      | { uploadUrl: string }
      | { error: UploadProblem };
    if ("error" in started) return { ok: false, error: started.error };

    const sent = await fetch(started.uploadUrl, {
      method: "POST",
      headers: { "Content-Type": file.type || "application/octet-stream" },
      body: file,
    });
    if (!sent.ok) return { ok: false, error: "failed" };
    const { storageId } = (await sent.json()) as { storageId: string };

    const response = await fetch("/admin/upload/process", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ storageId }),
    });
    const result = (await response.json()) as
      | { storageId: string; src: string; width: number; height: number }
      | { error: UploadProblem };
    if ("error" in result) return { ok: false, error: result.error };
    return { ok: true, image: { ...result, alt: "", isNew: true } };
  } catch {
    return { ok: false, error: "failed" };
  }
}

/** A readable title from a file name: "low-tide_02.jpg" → "low tide 02". */
export function titleFromFileName(name: string): string {
  return name.replace(/\.[^.]+$/, "").replace(/[-_]+/g, " ").replace(/\s+/g, " ").trim().slice(0, 200);
}
