import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { fontVariables } from "@/app/fonts";
import { ThemeScript } from "@/components/theme/ThemeScript";
import { routing } from "@/i18n/routing";
import { getSiteSettings } from "@/lib/settings";
import { INSTAGRAM_URL, SITE_NAME, STUDIO_EMAIL } from "@/lib/site";

// The "Opening soon" page visitors see while SITE_LOCKED=true. The proxy
// rewrites every storefront request here (src/lib/site-lock.ts); it is never
// reached at this address otherwise. Like the admin, it renders its own <html>.

const locale = routing.defaultLocale;

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations({ locale, namespace: "ComingSoon" });
  return {
    title: SITE_NAME,
    description: t("description"),
    robots: { index: false, follow: false },
  };
}

export default async function ComingSoonPage() {
  const [t, settings] = await Promise.all([
    getTranslations({ locale, namespace: "ComingSoon" }),
    getSiteSettings(),
  ]);

  return (
    <html lang={locale} className={fontVariables} data-theme={settings.theme} suppressHydrationWarning>
      <head>
        <ThemeScript />
      </head>
      <body className="flex min-h-dvh flex-col bg-paper font-sans text-ink antialiased">
        <header className="border-b border-line">
          <div className="site-container flex min-h-16 items-center font-semibold">{SITE_NAME}</div>
        </header>
        <main className="site-container flex flex-1 flex-col justify-center py-16 md:py-24">
          <h1 className="font-serif text-display font-normal">
            {t.rich("title", { em: (chunks) => <em className="text-accent">{chunks}</em> })}
          </h1>
          <p className="mt-6 max-w-[32.5rem] leading-[1.65] text-muted md:text-[1.0625rem]">{t("body")}</p>
          <ul className="mt-8 flex flex-wrap gap-x-8 text-sm">
            <li>
              <a href={INSTAGRAM_URL} className="link inline-flex min-h-11 items-center">
                {t("instagram")}
              </a>
            </li>
            <li>
              <a href={`mailto:${STUDIO_EMAIL}`} className="link inline-flex min-h-11 items-center">
                {STUDIO_EMAIL}
              </a>
            </li>
          </ul>
        </main>
      </body>
    </html>
  );
}
