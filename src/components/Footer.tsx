import { getTranslations } from "next-intl/server";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { INSTAGRAM_URL, SITE_NAME } from "@/lib/site";

export async function Footer() {
  const t = await getTranslations("Footer");
  const year = new Date().getFullYear();

  return (
    <footer className="mt-24 border-t border-line">
      <div className="site-container flex flex-col gap-6 py-10 text-sm text-muted sm:flex-row sm:items-center sm:justify-between">
        <a href={INSTAGRAM_URL} className="link">
          {t("instagram")}
        </a>
        <LanguageSwitcher />
        <p>{t("copyright", { year, siteName: SITE_NAME })}</p>
      </div>
    </footer>
  );
}
