import type { MetadataRoute } from "next";
import { getSiteUrl, isIndexingAllowed } from "@/lib/site";

// /admin is deliberately not listed: naming it here would advertise it. Admin
// pages send noindex instead.
export default function robots(): MetadataRoute.Robots {
  if (!isIndexingAllowed()) {
    return { rules: { userAgent: "*", disallow: "/" } };
  }
  return {
    rules: { userAgent: "*", allow: "/" },
    sitemap: new URL("/sitemap.xml", getSiteUrl()).href,
  };
}
