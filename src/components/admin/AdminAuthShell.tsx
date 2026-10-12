import Image from "next/image";
import { getTranslations } from "next-intl/server";
import type { ReactNode } from "react";
import { ThemeScript } from "@/components/theme/ThemeScript";
import { ThemeToggle } from "@/components/theme/ThemeToggle";
import { routing } from "@/i18n/routing";
import { getPublishedArtworks } from "@/lib/artworks";
import { getSiteSettings } from "@/lib/settings";
import { SITE_NAME } from "@/lib/site";

/**
 * The admin sign-in screens: a featured painting on one side (the first piece
 * on Originals), the form on the other. Not part of the storefront layout.
 */
export async function AdminAuthShell({ children }: { children: ReactNode }) {
  const [t, settings, artworks] = await Promise.all([
    getTranslations({ locale: routing.defaultLocale, namespace: "Admin.login" }),
    getSiteSettings(),
    getPublishedArtworks(),
  ]);
  const featured = artworks.find((artwork) => artwork.images.length > 0);
  const cover = featured?.images[0];

  return (
    <>
      {/* The admin follows the visitor's own theme choice on these screens. */}
      <ThemeScript />
      <div className="flex min-h-dvh flex-wrap">
        <section className="flex min-h-80 flex-[1_1_32rem] flex-col justify-between gap-8 bg-well px-5 py-6 sm:px-10 sm:py-8">
          <div className="label-caps flex items-center justify-between gap-4">
            <span className="font-semibold">{SITE_NAME}</span>
            <ThemeToggle siteTheme={settings.theme} />
          </div>
          {featured && cover && (
            <figure className="flex flex-col items-center gap-6">
              <Image
                src={cover.src}
                width={cover.width}
                height={cover.height}
                alt={cover.alt || featured.title}
                sizes="(min-width: 1024px) 18rem, 70vw"
                className="h-auto max-h-[60vh] w-auto max-w-[min(18rem,70%)] object-contain shadow-[var(--shadow-art)]"
                priority
              />
              <figcaption className="font-serif text-xl text-muted italic">{featured.title}</figcaption>
            </figure>
          )}
          <a href={`/${routing.defaultLocale}/originals`} className="inline-flex min-h-11 items-center self-start text-sm">
            {t("backToShop")}
          </a>
        </section>
        <main className="flex flex-[1_1_30rem] items-center justify-center bg-panel px-5 py-16 sm:px-8">
          <div className="w-full max-w-[25rem] space-y-8">{children}</div>
        </main>
      </div>
    </>
  );
}

/** Eyebrow, serif heading with one accented word, and a short lede. */
export function AuthHeading({ eyebrow, heading, lede }: { eyebrow?: ReactNode; heading: ReactNode; lede?: ReactNode }) {
  return (
    <div className="space-y-3">
      {eyebrow && <p className="label-caps font-semibold text-accent">{eyebrow}</p>}
      <h1 className="heading-display">{heading}</h1>
      {lede && <p className="text-muted">{lede}</p>}
    </div>
  );
}
