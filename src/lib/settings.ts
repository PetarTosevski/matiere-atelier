import "server-only";
import { cache } from "react";
import { siteSettings } from "@/data/settings";
import { api, convexMutation, convexQuery, shouldUseStaticData } from "@/lib/convex";
import type { SiteSettings } from "@/lib/types";

/** The single site settings document (showPrices). */
export const getSiteSettings = cache(async (): Promise<SiteSettings> => {
  if (shouldUseStaticData()) return { ...siteSettings };
  return convexQuery(api.settings.get, {});
});

/** Writes only SiteSettings.showPrices; artworks are never touched. */
export async function setShowPrices(showPrices: boolean): Promise<void> {
  if (shouldUseStaticData()) throw new Error("Saving settings needs Convex");
  await convexMutation(api.settings.setShowPrices, { showPrices });
}
