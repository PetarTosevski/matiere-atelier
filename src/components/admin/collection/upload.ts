import type { EditorImage } from "@/lib/collection-changes";

export type UploadProblem = "tooLarge" | "heic" | "unsupported" | "unreadable" | "unauthorized" | "failed";

const MAX_BYTES = 20 * 1024 * 1024;

/** Sends one image to /admin/upload (processed with sharp, stored in Convex). */
export async function uploadImage(
  file: File,
): Promise<{ ok: true; image: EditorImage } | { ok: false; error: UploadProblem }> {
  if (file.size > MAX_BYTES) return { ok: false, error: "tooLarge" };
  try {
    const body = new FormData();
    body.append("file", file);
    const response = await fetch("/admin/upload", { method: "POST", body });
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
