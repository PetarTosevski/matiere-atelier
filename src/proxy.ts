import { NextResponse, type NextRequest } from "next/server";
import createMiddleware from "next-intl/middleware";
import { routing } from "./i18n/routing";
import {
  COMING_SOON_PATH,
  hasPreviewAccess,
  isPreviewToken,
  isSiteLocked,
  PREVIEW_COOKIE,
  PREVIEW_PARAM,
  previewCookieOptions,
  previewCookieValue,
} from "./lib/site-lock";

// Next.js 16 renamed middleware to proxy. This adds the locale prefix to
// every page request (`/` -> `/en`, `/originals` -> `/en/originals`).
const intl = createMiddleware(routing);

// Still reachable while the site is locked: unsubscribing must always work.
const OPEN_WHILE_LOCKED = /^\/[^/]+\/unsubscribe(\/|$)/;

export default async function proxy(request: NextRequest) {
  if (!isSiteLocked()) return intl(request);

  const { nextUrl } = request;
  const preview = nextUrl.searchParams.get(PREVIEW_PARAM);

  // ?preview=<token> lets this browser in; ?preview=off shows the holding page again.
  if (preview !== null) {
    const clean = nextUrl.clone();
    clean.searchParams.delete(PREVIEW_PARAM);
    const response = NextResponse.redirect(clean);
    const value = isPreviewToken(preview) ? await previewCookieValue() : null;
    if (value) response.cookies.set(PREVIEW_COOKIE, value, previewCookieOptions);
    else if (preview === "off") response.cookies.delete(PREVIEW_COOKIE);
    return response;
  }

  if (OPEN_WHILE_LOCKED.test(nextUrl.pathname) || (await hasPreviewAccess(request.cookies.get(PREVIEW_COOKIE)?.value))) {
    return intl(request);
  }

  const response = NextResponse.rewrite(new URL(COMING_SOON_PATH, request.url));
  response.headers.set("X-Robots-Tag", "noindex, nofollow");
  return response;
}

export const config = {
  // Skip the admin area (not localized), Next internals, API routes and
  // anything that looks like a file.
  matcher: "/((?!admin|api|_next|_vercel|.*\\..*).*)",
};
