import { z } from "zod";
import { parseArtworkFields, type ArtworkFormErrors } from "@/lib/artwork-form";
import type { AdminArtwork, ArtworkInput } from "@/lib/artworks";
import { isShopCurrency, type ShopCurrency } from "@/lib/currency";
import { amountToInput } from "@/lib/money";
import type { SiteSettings, Theme } from "@/lib/types";

// Server-side checks for the admin's "Publish changes": the whole collection
// in its new order, plus the site settings (shop currency, "Show prices", theme). Each piece goes through the same
// rules as a single artwork (parseArtworkFields).

export const MAX_WORKS = 500;

const workSchema = z.object({
  /** Identifies the piece in the browser; new pieces have no id yet. */
  key: z.string().min(1).max(100),
  id: z.string().min(1).max(100).nullable(),
  title: z.string().max(1000),
  slug: z.string().max(1000),
  description: z.string().max(40_000),
  priceMode: z.string().max(20),
  amount: z.string().max(50),
  status: z.string().max(20),
  published: z.boolean(),
  width: z.string().max(20),
  height: z.string().max(20),
  images: z.unknown(),
});

export const collectionChangesSchema = z.object({
  currency: z.string().max(3),
  showPrices: z.boolean(),
  theme: z.enum(["dark", "light"]),
  works: z.array(workSchema).max(MAX_WORKS),
});

export type CollectionChanges = z.infer<typeof collectionChangesSchema>;
export type WorkDraft = CollectionChanges["works"][number];

export type ParsedChanges =
  | {
      ok: true;
      currency: ShopCurrency;
      showPrices: boolean;
      theme: Theme;
      /** Every artwork in its new order; `id` is null for new pieces. */
      artworks: (ArtworkInput & { id: string | null })[];
    }
  | {
      ok: false;
      /** Field errors per piece, by key. Empty when the request itself was malformed. */
      errors: Record<string, ArtworkFormErrors>;
      currencyInvalid?: boolean;
    };

/**
 * Checks a publish request against the saved artworks. Saved pieces missing
 * from the request (added in another tab, say) are kept, after the others.
 */
export function parseCollectionChanges(raw: unknown, saved: AdminArtwork[]): ParsedChanges {
  const parsed = collectionChangesSchema.safeParse(raw);
  if (!parsed.success) return { ok: false, errors: {} };
  const { currency, showPrices, theme, works } = parsed.data;
  if (!isShopCurrency(currency)) return { ok: false, errors: {}, currencyInvalid: true };

  const byId = new Map(saved.map((artwork) => [artwork.id, artwork]));
  const keys = new Set<string>();
  const ids = new Set<string>();
  for (const work of works) {
    if (keys.has(work.key)) return { ok: false, errors: {} };
    keys.add(work.key);
    if (work.id !== null) {
      if (!byId.has(work.id) || ids.has(work.id)) return { ok: false, errors: {} };
      ids.add(work.id);
    }
  }

  const errors: Record<string, ArtworkFormErrors> = {};
  const artworks: (ArtworkInput & { id: string | null })[] = [];
  const slugs = new Map<string, string>();

  works.forEach((work, index) => {
    const existing = work.id === null ? null : byId.get(work.id)!;
    const result = parseArtworkFields(work, existing, index + 1, currency);
    if (!result.ok) {
      errors[work.key] = result.errors;
      return;
    }
    const owner = slugs.get(result.input.slug);
    if (owner !== undefined) {
      errors[work.key] = { ...errors[work.key], slug: "slugTaken" };
      return;
    }
    slugs.set(result.input.slug, work.key);
    // The position on the page is the Originals order.
    artworks.push({ ...result.input, sortOrder: index + 1, id: work.id });
  });

  // Saved pieces the request didn't mention keep their content and go last.
  const missing = saved.filter((artwork) => !ids.has(artwork.id));
  for (const artwork of missing) {
    if (slugs.has(artwork.slug)) {
      const key = slugs.get(artwork.slug)!;
      errors[key] = { ...errors[key], slug: "slugTaken" };
      continue;
    }
    // Listed field by field: Convex rejects unknown fields such as createdAt.
    artworks.push({
      id: artwork.id,
      slug: artwork.slug,
      title: artwork.title,
      description: artwork.description,
      priceMode: artwork.priceMode,
      priceAmount: artwork.priceAmount,
      currency,
      status: artwork.status,
      published: artwork.published,
      sortOrder: artworks.length + 1,
      dimensions: artwork.dimensions,
      images: artwork.images.map(({ storageId, width, height, alt }) => ({ storageId, width, height, alt })),
    });
  }

  if (Object.keys(errors).length > 0) return { ok: false, errors };
  return { ok: true, currency, showPrices, theme, artworks };
}

// ---- What the admin editor works with ----

export type EditorImage = {
  storageId: string;
  src: string;
  width: number;
  height: number;
  alt: string;
  /** Uploaded in this session and not published yet. */
  isNew?: boolean;
};

/** One piece in the admin editor: the request shape, with image URLs. */
export type EditorWork = Omit<WorkDraft, "images"> & { images: EditorImage[] };

/** A saved artwork as the editor shows it (amounts as typed, sizes as text). */
export function toEditorWork(artwork: AdminArtwork): EditorWork {
  return {
    key: artwork.id,
    id: artwork.id,
    title: artwork.title,
    slug: artwork.slug,
    description: artwork.description,
    priceMode: artwork.priceMode,
    amount: amountToInput(artwork.priceAmount),
    status: artwork.status,
    published: artwork.published,
    width: artwork.dimensions ? String(artwork.dimensions.width) : "",
    height: artwork.dimensions ? String(artwork.dimensions.height) : "",
    images: artwork.images.map(({ storageId, src, width, height, alt }) => ({
      storageId,
      src,
      width,
      height,
      alt,
    })),
  };
}

/** The publish request for the editor's current state. */
export function toChanges(settings: SiteSettings, works: EditorWork[]): CollectionChanges {
  return {
    currency: settings.currency,
    showPrices: settings.showPrices,
    theme: settings.theme,
    works: works.map((work) => ({
      ...work,
      images: work.images.map(({ storageId, width, height, alt }) => ({ storageId, width, height, alt })),
    })),
  };
}
