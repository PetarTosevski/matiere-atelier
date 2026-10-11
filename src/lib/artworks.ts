import "server-only";
import { cache } from "react";
import type { StoredArtwork } from "../../convex/artworks";
import { artworks as staticArtworks } from "@/data/artworks";
import { api, convexQuery, shouldUseStaticData } from "@/lib/convex";
import type { Artwork } from "@/lib/types";

// Pages read artworks only through this module. Data lives in Convex; the
// static Phase 1 file is only a development fallback (see lib/convex.ts).

/** Originals order: sortOrder ascending, then newest first. */
export function compareArtworks(a: Artwork, b: Artwork): number {
  return (
    a.sortOrder - b.sortOrder ||
    Date.parse(b.createdAt) - Date.parse(a.createdAt)
  );
}

/** Drops Convex-only fields (storage IDs) to match the shared Artwork shape. */
function fromConvex(stored: StoredArtwork): Artwork {
  return {
    ...stored,
    images: stored.images.map(({ src, width, height, alt }) => ({ src, width, height, alt })),
  };
}

export const getPublishedArtworks = cache(async (): Promise<Artwork[]> => {
  const published = shouldUseStaticData()
    ? staticArtworks.filter((artwork) => artwork.published)
    : (await convexQuery(api.artworks.listPublished, {})).map(fromConvex);
  return [...published].sort(compareArtworks);
});

/** Returns null for unknown slugs and for unpublished drafts. */
export const getArtworkBySlug = cache(
  async (slug: string): Promise<Artwork | null> => {
    if (shouldUseStaticData()) {
      return (
        staticArtworks.find((artwork) => artwork.published && artwork.slug === slug) ?? null
      );
    }
    const stored = await convexQuery(api.artworks.getPublishedBySlug, { slug });
    return stored ? fromConvex(stored) : null;
  },
);

/**
 * Looks up artworks by ID, drafts included, so the cart can tell a visitor
 * why a piece it remembered is gone. Callers decide what may be shown.
 */
export async function getArtworksByIds(ids: string[]): Promise<Artwork[]> {
  if (shouldUseStaticData()) {
    const wanted = new Set(ids);
    return staticArtworks.filter((artwork) => wanted.has(artwork.id));
  }
  return (await convexQuery(api.artworks.getByIds, { ids })).map(fromConvex);
}

export async function getPublishedSlugs(): Promise<string[]> {
  const published = await getPublishedArtworks();
  return published.map((artwork) => artwork.slug);
}
