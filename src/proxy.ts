import createMiddleware from "next-intl/middleware";
import { routing } from "./i18n/routing";

// Next.js 16 renamed middleware to proxy. This adds the locale prefix to
// every page request (`/` -> `/en`, `/originals` -> `/en/originals`).
export default createMiddleware(routing);

export const config = {
  // Skip the admin area (not localized), Next internals, API routes and
  // anything that looks like a file.
  matcher: "/((?!admin|api|_next|_vercel|.*\\..*).*)",
};
