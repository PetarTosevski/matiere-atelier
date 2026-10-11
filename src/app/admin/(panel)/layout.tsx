import { getTranslations } from "next-intl/server";
import Link from "next/link";
import { logoutAction } from "@/app/admin/actions";
import { routing } from "@/i18n/routing";
import { requireAdminPage } from "@/lib/auth";
import { SITE_NAME } from "@/lib/site";

export default async function AdminPanelLayout({ children }: { children: React.ReactNode }) {
  await requireAdminPage();
  const t = await getTranslations({ locale: routing.defaultLocale, namespace: "Admin.nav" });

  return (
    <>
      <header className="border-b border-line bg-panel">
        <div className="site-container flex flex-wrap items-center justify-between gap-4 py-4">
          <p>
            {SITE_NAME} <span className="text-muted">{t("label")}</span>
          </p>
          <nav aria-label={t("label")} className="flex flex-wrap items-center gap-6">
            <Link href="/admin" className="link">{t("artworks")}</Link>
            <Link href="/admin/about" className="link">{t("about")}</Link>
            <Link href="/admin/settings" className="link">{t("settings")}</Link>
            <a href={`/${routing.defaultLocale}/originals`} className="link">{t("viewSite")}</a>
            <form action={logoutAction}>
              <button type="submit" className="link min-h-11">{t("logout")}</button>
            </form>
          </nav>
        </div>
      </header>
      <main className="site-container py-8 md:py-12">{children}</main>
    </>
  );
}
