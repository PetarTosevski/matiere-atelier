import { existsSync } from "node:fs";
import path from "node:path";
import { Link } from "@/i18n/navigation";
import { SITE_NAME } from "@/lib/site";

/** Uses public/logo.svg when it exists, otherwise the site name as text. */
export function Wordmark() {
  const hasLogo = existsSync(path.join(process.cwd(), "public", "logo.svg"));

  return (
    <Link href="/originals" className="text-lg tracking-tight md:text-xl">
      {hasLogo ? (
        // A plain <img> because the logo's dimensions aren't known in advance.
        // eslint-disable-next-line @next/next/no-img-element
        <img src="/logo.svg" alt={SITE_NAME} className="h-8 w-auto" />
      ) : (
        SITE_NAME
      )}
    </Link>
  );
}
