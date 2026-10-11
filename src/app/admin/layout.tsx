import type { Metadata } from "next";
import { NextIntlClientProvider } from "next-intl";
import { getTranslations } from "next-intl/server";
import { fontVariables } from "@/app/fonts";
import { routing } from "@/i18n/routing";
import { getSiteSettings } from "@/lib/settings";
import { SITE_NAME } from "@/lib/site";
import messages from "../../../messages/en.json";

// The admin area is not localized. It uses the default locale's copy and is
// never indexed (see also the X-Robots-Tag header in next.config.ts).

const locale = routing.defaultLocale;

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations({ locale, namespace: "Admin" });
  return {
    title: { default: `${t("metaTitle")} · ${SITE_NAME}`, template: `%s · ${t("metaTitle")}` },
    robots: { index: false, follow: false },
  };
}

export default async function AdminRootLayout({ children }: LayoutProps<"/admin">) {
  // The admin shows the site default theme (the collection editor previews changes to it).
  const { theme } = await getSiteSettings();
  return (
    <html lang={locale} className={fontVariables} data-theme={theme} suppressHydrationWarning>
      <body className="min-h-dvh bg-paper font-sans text-ink antialiased">
        <NextIntlClientProvider locale={locale} messages={messages}>
          {children}
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
