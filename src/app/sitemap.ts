import type { MetadataRoute } from "next";
import { routing } from "@/i18n/routing";
import { getPublishedArtworks } from "@/lib/artworks";
import { getSiteUrl } from "@/lib/site";
import { isSiteLocked } from "@/lib/site-lock";

// Public pages and every published artwork. Drafts never appear, because
// getPublishedArtworks() only returns published pieces. Admin changes refresh
// it (refreshStorefront in app/admin/actions.ts).
const PAGES = ["/originals", "/commissions", "/about", "/contact"];

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  // While the site is hidden (SITE_LOCKED), it lists nothing.
  if (isSiteLocked()) return [];
  const artworks = await getPublishedArtworks();
  const site = getSiteUrl();

  return routing.locales.flatMap((locale) => [
    ...PAGES.map((path) => ({ url: new URL(`/${locale}${path}`, site).href })),
    ...artworks.map((artwork) => ({
      url: new URL(`/${locale}/originals/${artwork.slug}`, site).href,
      images: artwork.images.slice(0, 1).map((image) => new URL(image.src, site).href),
    })),
  ]);
}
