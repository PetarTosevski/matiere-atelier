import { getTranslations } from "next-intl/server";
import { CurrencySwitcher } from "@/components/currency/CurrencySwitcher";
import { ThemeToggle } from "@/components/theme/ThemeToggle";
import { Link } from "@/i18n/navigation";
import { getSiteSettings } from "@/lib/settings";
import { INSTAGRAM_URL, SITE_NAME, STUDIO_EMAIL } from "@/lib/site";

export async function Footer() {
  const [t, settings] = await Promise.all([getTranslations("Footer"), getSiteSettings()]);
  const year = new Date().getFullYear();

  return (
    <footer className="mt-18 border-t border-line text-sm text-faint md:mt-24 lg:mt-28">
      <div className="site-container flex flex-col gap-5 py-10 md:flex-row md:flex-wrap md:items-center md:justify-between md:gap-x-10 lg:py-11">
        <p>{t("copyright", { year, siteName: SITE_NAME })}</p>
        <div className="flex flex-col gap-5 sm:flex-row sm:flex-wrap sm:items-center sm:gap-x-10">
          <ul className="flex flex-wrap gap-x-6">
            <li>
              <a href={INSTAGRAM_URL} className="inline-flex min-h-11 items-center">
                {t("instagram")}
              </a>
            </li>
            <li>
              <Link href="/contact" className="inline-flex min-h-11 items-center">
                {t("contact")}
              </Link>
            </li>
            <li>
              <a href={`mailto:${STUDIO_EMAIL}`} className="inline-flex min-h-11 items-center">
                {STUDIO_EMAIL}
              </a>
            </li>
          </ul>
          <div className="flex flex-wrap items-center gap-x-8">
            <CurrencySwitcher />
            <ThemeToggle siteTheme={settings.theme} />
          </div>
        </div>
      </div>
    </footer>
  );
}
