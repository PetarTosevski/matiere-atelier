import "server-only";
import { cache } from "react";
import type { StoredArtwork } from "../../convex/artworks";
import { artworks as staticArtworks } from "@/data/artworks";
import { api, convexMutation, convexQuery, shouldUseStaticData } from "@/lib/convex";
import { compareArtworks } from "@/lib/order";
import type { Artwork, ArtworkImage, Status } from "@/lib/types";

// Pages read artworks only through this module. Data lives in Convex; the
// static Phase 1 file is only a development fallback (see lib/convex.ts).

export { compareArtworks };

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

// ---- Admin (Convex only) ----

export type AdminImage = ArtworkImage & { storageId: string };
export type AdminArtwork = Omit<Artwork, "images"> & { images: AdminImage[] };

/** What the admin form saves; createdAt is set by Convex on creation. */
export type ArtworkInput = Omit<Artwork, "id" | "createdAt" | "images"> & {
  images: { storageId: string; width: number; height: number; alt: string }[];
};

function requireConvex() {
  if (shouldUseStaticData()) {
    throw new Error("The admin area needs Convex: set CONVEX_URL and CONVEX_SERVER_SECRET");
  }
}

const asAdmin = (stored: StoredArtwork): AdminArtwork => stored;

/** Every artwork, drafts included, in Originals order. */
export async function getAllArtworksForAdmin(): Promise<AdminArtwork[]> {
  requireConvex();
  const all = (await convexQuery(api.artworks.listAll, {})).map(asAdmin);
  return all.sort(compareArtworks);
}

export async function getArtworkForAdmin(id: string): Promise<AdminArtwork | null> {
  requireConvex();
  const stored = await convexQuery(api.artworks.getById, { id });
  return stored ? asAdmin(stored) : null;
}

const toConvexInput = (input: ArtworkInput) => ({
  ...input,
  images: input.images.map((image) => ({ ...image, storageId: image.storageId as never })),
});

export async function createArtwork(input: ArtworkInput): Promise<string> {
  requireConvex();
  return convexMutation(api.artworks.create, toConvexInput(input));
}

export async function updateArtwork(id: string, input: ArtworkInput): Promise<void> {
  requireConvex();
  await convexMutation(api.artworks.update, { id: id as never, ...toConvexInput(input) });
}

export async function deleteArtwork(id: string): Promise<void> {
  requireConvex();
  await convexMutation(api.artworks.remove, { id: id as never });
}

export async function setArtworkStatus(id: string, status: Status): Promise<void> {
  requireConvex();
  await convexMutation(api.artworks.setStatus, { id: id as never, status });
}

/** Saves a new Originals order: the first ID gets sortOrder 1, and so on. */
export async function reorderArtworks(ids: string[]): Promise<void> {
  requireConvex();
  await convexMutation(api.artworks.reorder, { ids: ids as never });
}
