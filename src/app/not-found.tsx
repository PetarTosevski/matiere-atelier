import { getTranslations } from "next-intl/server";
import { fontVariables } from "@/app/fonts";
import { routing } from "@/i18n/routing";

// Requests outside the locale routes (the proxy skips paths that look like
// files) land here, so there is no locale layout around it.
export default async function RootNotFound() {
  const locale = routing.defaultLocale;
  const t = await getTranslations({ locale, namespace: "NotFound" });

  return (
    <html lang={locale} className={fontVariables}>
      <body className="bg-paper font-sans text-ink">
        <main className="site-container py-24">
          <h1 className="heading-display">{t("title")}</h1>
          <p className="mt-4 text-muted">{t("body")}</p>
          <p className="mt-8">
            <a href={`/${locale}/originals`} className="link">
              {t("backToOriginals")}
            </a>
          </p>
        </main>
      </body>
    </html>
  );
}
