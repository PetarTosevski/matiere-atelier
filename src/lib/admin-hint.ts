// Where the storefront's "Edit" link goes from a given page. The pathname is
// without the locale prefix ("/originals/first-tracks").

export type AdminEditTarget =
  | { kind: "piece"; href: string }
  | { kind: "about"; href: string }
  | { kind: "collection"; href: string };

export function adminEditTarget(pathname: string): AdminEditTarget {
  const piece = /^\/(?:originals|request)\/([^/]+)\/?$/.exec(pathname);
  if (piece) return { kind: "piece", href: `/admin?edit=${encodeURIComponent(decodeURIComponent(piece[1]!))}` };
  if (/^\/about\/?$/.test(pathname)) return { kind: "about", href: "/admin/about" };
  return { kind: "collection", href: "/admin" };
}
