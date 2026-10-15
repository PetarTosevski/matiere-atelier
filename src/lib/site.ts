export const SITE_NAME = "Matière Atelier";

/** Public origin for absolute URLs (Open Graph). Set it before `npm run build`. */
export function getSiteUrl(): URL {
  return new URL(process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000");
}

/** Placeholder until the artist's account is confirmed. */
export const INSTAGRAM_URL = "https://www.instagram.com/";

/** The studio's public email address (a Google Workspace alias of the artist's inbox). */
export const STUDIO_EMAIL = "studio@matiereatelier.info";

/**
 * Search engines are kept out until launch: set ALLOW_INDEXING=true in the
 * production environment and redeploy to open the site to them.
 */
export function isIndexingAllowed(): boolean {
  return process.env.ALLOW_INDEXING?.trim().toLowerCase() === "true";
}
