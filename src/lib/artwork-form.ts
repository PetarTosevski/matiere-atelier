import { z } from "zod";
import type { AdminArtwork, ArtworkInput } from "@/lib/artworks";
import { DEFAULT_CURRENCY } from "@/lib/currency";
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

export const MAX_IMAGES = 20;

export const imagesSchema = z
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

/** One artwork as the admin edits it: text fields as typed, images as uploaded. */
export type ArtworkFields = {
  title: string;
  slug: string;
  description: string;
  priceMode: string;
  amount: string;
  status: string;
  published: boolean;
  width: string;
  height: string;
  /** Unchecked: validated here. */
  images: unknown;
};

export type ParsedArtwork =
  | { ok: true; input: ArtworkInput }
  | { ok: false; errors: ArtworkFormErrors };

const text = (form: FormData, key: string) => {
  const value = form.get(key);
  return typeof value === "string" ? value : "";
};

/** Reads a submitted form (images as a JSON string) into ArtworkFields. */
export function parseArtworkForm(
  form: FormData,
  existing: AdminArtwork | null,
  newSortOrder: number,
  currency: string = existing?.currency ?? DEFAULT_CURRENCY,
): ParsedArtwork {
  let images: unknown = null;
  try {
    images = JSON.parse(text(form, "images") || "[]");
  } catch {
    images = null;
  }
  return parseArtworkFields(
    {
      title: text(form, "title"),
      slug: text(form, "slug"),
      description: text(form, "description"),
      priceMode: text(form, "priceMode"),
      amount: text(form, "amount"),
      status: text(form, "status"),
      published: form.get("published") === "on",
      width: text(form, "width"),
      height: text(form, "height"),
      images,
    },
    existing,
    newSortOrder,
    currency,
  );
}

/**
 * Checks one artwork and turns it into an ArtworkInput. `existing` is the
 * saved artwork when editing; it decides what happens to fields left empty.
 * `sortOrder` applies to new pieces; saved ones keep theirs unless the caller
 * overrides it.
 */
export function parseArtworkFields(
  fields: ArtworkFields,
  existing: AdminArtwork | null,
  sortOrder: number,
  currency: string,
): ParsedArtwork {
  const errors: ArtworkFormErrors = {};
  const field = (key: Exclude<keyof ArtworkFields, "published" | "images">) => fields[key];

  const title = field("title").trim();
  if (!title) errors.title = "required";
  else if (title.length > 200) errors.title = "tooLong";

  const typedSlug = field("slug").trim().toLowerCase();
  const slug = typedSlug || slugify(title);
  if (slug.length > MAX_SLUG_LENGTH) errors.slug = "tooLong";
  else if (!SLUG_PATTERN.test(slug)) errors.slug = title || typedSlug ? "invalidSlug" : "required";

  // Browsers submit textarea line breaks as CRLF; store plain LF.
  const description = field("description").replace(/\r\n?/g, "\n");
  if (description.length > 20_000) errors.description = "tooLong";

  const modeValue = field("priceMode");
  const priceMode = modeValue === "DISPLAY" || modeValue === "AUCTION" ? modeValue : "PRICE";
  // Auction isn't offered yet: it may only stay on a piece that already has it.
  if (priceMode === "AUCTION" && existing?.priceMode !== "AUCTION") {
    errors.priceMode = "auctionUnavailable";
  }

  // Changing the mode never clears the amount, so switching back restores it.
  const amountText = field("amount").trim();
  let priceAmount: number | null = existing?.priceAmount ?? null;
  if (amountText) {
    const parsed = parseAmount(amountText);
    if (parsed === null) errors.amount = "invalidAmount";
    else priceAmount = parsed;
  } else if (priceMode === "PRICE") {
    // A draft may wait for its price ("No price set"); a piece on the site may not.
    if (fields.published) errors.amount = "amountRequired";
    else priceAmount = null;
  } else if (existing === null) {
    priceAmount = null;
  }

  let images: z.infer<typeof imagesSchema> = [];
  const parsedImages = imagesSchema.safeParse(fields.images);
  if (parsedImages.success) images = parsedImages.data;
  else errors.images = "invalidImages";

  const published = fields.published;
  if (published && images.length === 0 && !errors.images) errors.images = "imagesRequired";

  const status = field("status") === "SOLD" ? "SOLD" : "AVAILABLE";

  // Size is optional, but if one side is given both must be valid.
  const widthText = field("width").trim();
  const heightText = field("height").trim();
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
      currency,
      status,
      published,
      sortOrder: existing?.sortOrder ?? sortOrder,
      dimensions,
      images: images.map((image) => ({ ...image, alt: image.alt || title })),
    },
  };
}
