import "server-only";
import { cache } from "react";
import { siteSettings } from "@/data/settings";
import { api, convexQuery, shouldUseStaticData } from "@/lib/convex";
import type { SiteSettings } from "@/lib/types";

/** The single site settings document (showPrices). */
export const getSiteSettings = cache(async (): Promise<SiteSettings> => {
  if (shouldUseStaticData()) return { ...siteSettings };
  return convexQuery(api.settings.get, {});
});
