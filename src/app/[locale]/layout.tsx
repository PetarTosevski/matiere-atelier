import type { Metadata } from "next";
import { NextIntlClientProvider } from "next-intl";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { CartNotices } from "@/components/cart/CartNotices";
import { CartProvider } from "@/components/cart/CartProvider";
import { Footer } from "@/components/Footer";
import { Header } from "@/components/Header";
import { toLocale } from "@/i18n/locale";
import { routing } from "@/i18n/routing";
import { baseOpenGraph } from "@/lib/metadata";
import { isCartEnabled } from "@/lib/pricing";
import { getSiteSettings } from "@/lib/settings";
import { getSiteUrl, SITE_NAME } from "@/lib/site";

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export async function generateMetadata({
  params,
}: LayoutProps<"/[locale]">): Promise<Metadata> {
  const locale = toLocale((await params).locale);
  const t = await getTranslations({ locale, namespace: "Metadata" });

  return {
    metadataBase: getSiteUrl(),
    title: {
      default: SITE_NAME,
      template: t("titleTemplate", { siteName: SITE_NAME }),
    },
    description: t("description"),
    openGraph: baseOpenGraph(locale),
  };
}

export default async function LocaleLayout({
  children,
  params,
}: LayoutProps<"/[locale]">) {
  const locale = toLocale((await params).locale);
  setRequestLocale(locale);
  const [t, settings] = await Promise.all([
    getTranslations("Layout"),
    getSiteSettings(),
  ]);

  return (
    <html lang={locale}>
      <body className="flex min-h-dvh flex-col bg-paper font-sans text-ink antialiased">
        <NextIntlClientProvider>
          <CartProvider enabled={isCartEnabled(settings)}>
          <a
            href="#main"
            className="sr-only focus:not-sr-only focus:absolute focus:top-3 focus:left-3 focus:z-50 focus:bg-paper focus:px-4 focus:py-2"
          >
            {t("skipToContent")}
          </a>
          <Header />
          <CartNotices />
          <main id="main" tabIndex={-1} className="flex-1 pt-6 focus:outline-none md:pt-8">
            {children}
          </main>
          <Footer />
          </CartProvider>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
