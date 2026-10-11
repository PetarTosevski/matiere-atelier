import "server-only";
import { siteSettings } from "@/data/settings";
import type { SiteSettings } from "@/lib/types";

/** Phase 2 reads the single SiteSettings row instead. */
export async function getSiteSettings(): Promise<SiteSettings> {
  return { ...siteSettings };
}
