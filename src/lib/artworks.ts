import "server-only";
import { cache } from "react";
import { artworks } from "@/data/artworks";
import type { Artwork } from "@/lib/types";

// Pages read artworks only through this module. Phase 2 replaces the static
// file with Prisma here; the function signatures stay the same.

/** Originals order: sortOrder ascending, then newest first. */
export function compareArtworks(a: Artwork, b: Artwork): number {
  return (
    a.sortOrder - b.sortOrder ||
    Date.parse(b.createdAt) - Date.parse(a.createdAt)
  );
}

export const getPublishedArtworks = cache(async (): Promise<Artwork[]> => {
  return artworks.filter((artwork) => artwork.published).sort(compareArtworks);
});

/** Returns null for unknown slugs and for unpublished drafts. */
export const getArtworkBySlug = cache(
  async (slug: string): Promise<Artwork | null> => {
    return (
      artworks.find((artwork) => artwork.published && artwork.slug === slug) ??
      null
    );
  },
);

export async function getPublishedSlugs(): Promise<string[]> {
  const published = await getPublishedArtworks();
  return published.map((artwork) => artwork.slug);
}
