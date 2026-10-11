import { getPriceView } from "@/lib/pricing";
import type { Artwork, ArtworkImage, SiteSettings } from "@/lib/types";

// Each original is unique, so the cart is a list of artwork IDs (quantity is
// always 1). Prices and availability always come from the server: the
// browser only remembers IDs.

export const MAX_CART_ITEMS = 50;

export type CartItem = {
  id: string;
  slug: string;
  title: string;
  image: ArtworkImage | null;
  price: { amount: number; currency: string };
};

export type RemovedReason =
  /** Priced, but sold since it was added. */
  | "SOLD"
  /** Still published, but its price is no longer shown. */
  | "NOT_PRICED"
  /** Unpublished or deleted. */
  | "UNAVAILABLE";

export type RemovedItem = {
  id: string;
  /** Null when the piece is no longer public, so its title isn't revealed. */
  title: string | null;
  reason: RemovedReason;
};

export type ResolvedCart = { items: CartItem[]; removed: RemovedItem[] };

/** Splits remembered IDs into purchasable items and pieces to drop. */
export function resolveCart(
  ids: string[],
  artworks: Artwork[],
  settings: SiteSettings,
): ResolvedCart {
  const byId = new Map(artworks.map((artwork) => [artwork.id, artwork]));
  const items: CartItem[] = [];
  const removed: RemovedItem[] = [];

  for (const id of new Set(ids)) {
    const artwork = byId.get(id);
    if (!artwork || !artwork.published) {
      removed.push({ id, title: null, reason: "UNAVAILABLE" });
      continue;
    }

    const view = getPriceView(artwork, settings);
    if (view.action === "ADD_TO_CART" && view.price) {
      items.push({
        id: artwork.id,
        slug: artwork.slug,
        title: artwork.title,
        image: artwork.images[0] ?? null,
        price: view.price,
      });
    } else {
      removed.push({
        id,
        title: artwork.title,
        reason: view.availability === "SOLD" && view.price ? "SOLD" : "NOT_PRICED",
      });
    }
  }

  return { items, removed };
}

/** Totals per currency (all pieces are EUR today, but don't assume it). */
export function subtotals(
  items: Pick<CartItem, "price">[],
): { amount: number; currency: string }[] {
  const totals = new Map<string, number>();
  for (const { price } of items) {
    totals.set(price.currency, (totals.get(price.currency) ?? 0) + price.amount);
  }
  return [...totals].map(([currency, amount]) => ({ amount, currency }));
}
