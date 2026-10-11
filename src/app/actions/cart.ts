"use server";

import { z } from "zod";
import { getArtworksByIds } from "@/lib/artworks";
import { MAX_CART_ITEMS, resolveCart, type ResolvedCart } from "@/lib/cart";
import { isCartEnabled } from "@/lib/pricing";
import { getSiteSettings } from "@/lib/settings";

const idsSchema = z.array(z.string().min(1).max(64)).max(MAX_CART_ITEMS);

/** Checks the IDs a browser remembers against current data. */
export async function resolveCartAction(ids: unknown): Promise<ResolvedCart> {
  const parsed = idsSchema.safeParse(ids);
  if (!parsed.success) return { items: [], removed: [] };

  const settings = await getSiteSettings();
  // Showcase mode: the cart is hidden, so leave the remembered IDs alone.
  if (!isCartEnabled(settings)) return { items: [], removed: [] };

  const artworks = await getArtworksByIds(parsed.data);
  return resolveCart(parsed.data, artworks, settings);
}
