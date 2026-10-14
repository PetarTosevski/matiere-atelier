// Before launch the storefront can be hidden behind an "Opening soon" page
// (SITE_LOCKED=true). Browsers holding the preview cookie see the real site:
// it is set by the secret preview link (/?preview=<SITE_PREVIEW_TOKEN>) and
// by signing in to the admin. /admin itself is never locked. Used by the proxy,
// so no Node-only APIs here.

export const PREVIEW_COOKIE = "matiere_preview";
export const PREVIEW_PARAM = "preview";
/** The rewrite target in the proxy (src/app/coming-soon). */
export const COMING_SOON_PATH = "/coming-soon";

const PREVIEW_MAX_AGE = 90 * 24 * 60 * 60; // seconds

export function isSiteLocked(): boolean {
  return process.env.SITE_LOCKED === "true";
}

export function previewToken(): string | null {
  return process.env.SITE_PREVIEW_TOKEN?.trim() || null;
}

/**
 * The cookie value: an HMAC of the preview token with SESSION_SECRET, so the
 * cookie can't be made up, and changing either variable revokes every
 * preview cookie. Null without SESSION_SECRET.
 */
export async function previewCookieValue(): Promise<string | null> {
  const secret = process.env.SESSION_SECRET;
  if (!secret) return null;
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const signature = await crypto.subtle.sign("HMAC", key, encoder.encode(`preview:${previewToken() ?? ""}`));
  return Array.from(new Uint8Array(signature), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

export async function hasPreviewAccess(cookieValue: string | undefined): Promise<boolean> {
  if (!cookieValue) return false;
  const expected = await previewCookieValue();
  return expected !== null && timingSafeEqual(cookieValue, expected);
}

/** Whether a ?preview= value is the secret token. */
export function isPreviewToken(value: string | null): boolean {
  const token = previewToken();
  return Boolean(token && value && timingSafeEqual(value, token));
}

export const previewCookieOptions = {
  httpOnly: true,
  // Browsers drop secure cookies on plain-http localhost.
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax" as const,
  path: "/",
  maxAge: PREVIEW_MAX_AGE,
};

function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}
