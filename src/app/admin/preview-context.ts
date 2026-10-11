import "server-only";
import type { PreviewArtwork } from "@/components/admin/PreviewDialog";
import { getAllArtworksForAdmin } from "@/lib/artworks";
import { getSiteSettings } from "@/lib/settings";

export type PreviewContext = {
  /** Published pieces as saved (admin pages only, behind the session check). */
  pieces: PreviewArtwork[];
  showPrices: boolean;
  /** Where a new piece lands: before everything else (matches saveArtworkAction). */
  newSortOrder: number;
};

/** What the page preview needs. `excludeId` leaves out the piece being edited. */
export async function getPreviewContext(excludeId: string | null): Promise<PreviewContext> {
  const [all, settings] = await Promise.all([getAllArtworksForAdmin(), getSiteSettings()]);
  return {
    pieces: all
      .filter((artwork) => artwork.published && artwork.id !== excludeId)
      .map((artwork) => ({
        ...artwork,
        // Drop storage IDs: the preview only needs what the storefront shows.
        images: artwork.images.map(({ src, width, height, alt }) => ({ src, width, height, alt })),
      })),
    showPrices: settings.showPrices,
    newSortOrder: Math.min(1, ...all.map((artwork) => artwork.sortOrder)) - 1,
  };
}
