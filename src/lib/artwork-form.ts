import { z } from "zod";
import type { AdminArtwork, ArtworkInput } from "@/lib/artworks";
import { parseAmount } from "@/lib/money";
import { MAX_SLUG_LENGTH, SLUG_PATTERN, slugify } from "@/lib/slug";

// Server-side validation for the admin upload and edit form. Error values are
// message keys (Admin.form.errors.*).

export type ArtworkFieldError =
  | "required"
  | "tooLong"
  | "invalidSlug"
  | "slugTaken"
  | "amountRequired"
  | "invalidAmount"
  | "imagesRequired"
  | "invalidImages"
  | "invalidDimensions"
  | "auctionUnavailable";

export type ArtworkFormErrors = Partial<
  Record<"title" | "slug" | "description" | "priceMode" | "amount" | "images" | "dimensions", ArtworkFieldError>
>;

/** The only currency for now; currency selection is listed under Later. */
export const DEFAULT_CURRENCY = "EUR";
export const MAX_IMAGES = 20;

const imagesSchema = z
  .array(
    z.object({
      storageId: z.string().min(1).max(100),
      width: z.number().int().positive(),
      height: z.number().int().positive(),
      alt: z.string().trim().max(300),
    }),
  )
  .max(MAX_IMAGES);

const CENTIMETRES = /^\d{1,4}(?:[.,]\d{1,2})?$/;

/** "61", "61.5" or "61,5" in centimetres; null when not a valid size. */
export function parseCentimetres(input: string): number | null {
  const value = input.trim();
  if (!CENTIMETRES.test(value)) return null;
  const number = Number(value.replace(",", "."));
  return number > 0 && number <= 2000 ? number : null;
}

const text = (form: FormData, key: string) => {
  const value = form.get(key);
  return typeof value === "string" ? value : "";
};

/**
 * Reads the form into an ArtworkInput. `existing` is the saved artwork when
 * editing; it decides what happens to fields the form may leave out.
 */
export function parseArtworkForm(
  form: FormData,
  existing: AdminArtwork | null,
  newSortOrder: number,
): { ok: true; input: ArtworkInput } | { ok: false; errors: ArtworkFormErrors } {
  const errors: ArtworkFormErrors = {};

  const title = text(form, "title").trim();
  if (!title) errors.title = "required";
  else if (title.length > 200) errors.title = "tooLong";

  const typedSlug = text(form, "slug").trim().toLowerCase();
  const slug = typedSlug || slugify(title);
  if (slug.length > MAX_SLUG_LENGTH) errors.slug = "tooLong";
  else if (!SLUG_PATTERN.test(slug)) errors.slug = title || typedSlug ? "invalidSlug" : "required";

  // Browsers submit textarea line breaks as CRLF; store plain LF.
  const description = text(form, "description").replace(/\r\n?/g, "\n");
  if (description.length > 20_000) errors.description = "tooLong";

  const modeValue = text(form, "priceMode");
  const priceMode = modeValue === "DISPLAY" || modeValue === "AUCTION" ? modeValue : "PRICE";
  // Auction isn't offered yet: it may only stay on a piece that already has it.
  if (priceMode === "AUCTION" && existing?.priceMode !== "AUCTION") {
    errors.priceMode = "auctionUnavailable";
  }

  // Changing the mode never clears the amount, so switching back restores it.
  const amountText = text(form, "amount").trim();
  let priceAmount: number | null = existing?.priceAmount ?? null;
  if (amountText) {
    const parsed = parseAmount(amountText);
    if (parsed === null) errors.amount = "invalidAmount";
    else priceAmount = parsed;
  } else if (priceMode === "PRICE") {
    errors.amount = "amountRequired";
  } else if (existing === null) {
    priceAmount = null;
  }

  let images: z.infer<typeof imagesSchema> = [];
  try {
    const parsed = imagesSchema.safeParse(JSON.parse(text(form, "images") || "[]"));
    if (parsed.success) images = parsed.data;
    else errors.images = "invalidImages";
  } catch {
    errors.images = "invalidImages";
  }

  const published = form.get("published") === "on";
  if (published && images.length === 0 && !errors.images) errors.images = "imagesRequired";

  const status = text(form, "status") === "SOLD" ? "SOLD" : "AVAILABLE";

  // Size is optional, but if one side is given both must be valid.
  const widthText = text(form, "width").trim();
  const heightText = text(form, "height").trim();
  let dimensions: { width: number; height: number } | null = null;
  if (widthText || heightText) {
    const width = parseCentimetres(widthText);
    const height = parseCentimetres(heightText);
    if (width === null || height === null) errors.dimensions = "invalidDimensions";
    else dimensions = { width, height };
  }

  if (Object.keys(errors).length > 0) return { ok: false, errors };

  return {
    ok: true,
    input: {
      slug,
      title,
      description,
      priceMode,
      priceAmount,
      currency: existing?.currency ?? DEFAULT_CURRENCY,
      status,
      published,
      sortOrder: existing?.sortOrder ?? newSortOrder,
      dimensions,
      images: images.map((image) => ({ ...image, alt: image.alt || title })),
    },
  };
}
