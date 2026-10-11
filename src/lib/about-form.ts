import { z } from "zod";
import type { AboutInput } from "@/lib/pages";

// Server-side validation for the About page form. Errors are message keys
// (Admin.about.errors.*).

export type AboutFieldError = "tooLong" | "invalidPortrait" | "altRequired";
export type AboutFormErrors = Partial<Record<"bio" | "portrait", AboutFieldError>>;

export const MAX_BIO_LENGTH = 20_000;

const portraitSchema = z
  .object({
    storageId: z.string().min(1).max(100),
    width: z.number().int().positive(),
    height: z.number().int().positive(),
    alt: z.string().trim().max(300),
  })
  .nullable();

export function parseAboutForm(
  form: FormData,
): { ok: true; input: AboutInput } | { ok: false; errors: AboutFormErrors } {
  const errors: AboutFormErrors = {};

  const rawBio = form.get("bio");
  // Browsers submit textarea line breaks as CRLF; store plain LF.
  const bio = typeof rawBio === "string" ? rawBio.replace(/\r\n?/g, "\n") : "";
  if (bio.length > MAX_BIO_LENGTH) errors.bio = "tooLong";

  let portrait: z.infer<typeof portraitSchema> = null;
  try {
    const raw = form.get("portrait");
    const parsed = portraitSchema.safeParse(JSON.parse(typeof raw === "string" && raw ? raw : "null"));
    if (parsed.success) portrait = parsed.data;
    else errors.portrait = "invalidPortrait";
  } catch {
    errors.portrait = "invalidPortrait";
  }
  // There is no title to fall back on here, so a portrait needs its own alt text.
  if (portrait && !portrait.alt) errors.portrait = "altRequired";

  if (Object.keys(errors).length > 0) return { ok: false, errors };
  return { ok: true, input: { bio, portrait } };
}
