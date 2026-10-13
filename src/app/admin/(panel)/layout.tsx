import { getTranslations } from "next-intl/server";
import { LogoutForm } from "@/components/admin-hint/LogoutForm";
import { RememberAdmin } from "@/components/admin-hint/RememberAdmin";
import { routing } from "@/i18n/routing";
import { requireAdminPage } from "@/lib/auth";

// The pink admin bar sits above every admin page. Links are plain <a>
// elements so that leaving the collection with unpublished changes goes
// through the browser's "leave page?" check (a client-side <Link> skips it).
/* eslint-disable @next/next/no-html-link-for-pages */

export default async function AdminPanelLayout({ children }: { children: React.ReactNode }) {
  await requireAdminPage();
  const t = await getTranslations({ locale: routing.defaultLocale, namespace: "Admin.nav" });

  return (
    <>
      <RememberAdmin />
      <div className="bg-admin text-on-admin">
        <div className="mx-auto flex max-w-[82.5rem] flex-wrap items-center justify-between gap-x-6 gap-y-2 px-4 py-2 sm:px-8">
          <strong className="label-caps">{t("mode")}</strong>
          <nav aria-label={t("label")}>
            <ul className="flex flex-wrap items-center gap-x-5 text-sm">
              <li><a href="/admin" className="inline-flex min-h-10 items-center underline-offset-4 hover:text-on-admin hover:underline">{t("artworks")}</a></li>
              <li><a href="/admin/about" className="inline-flex min-h-10 items-center underline-offset-4 hover:text-on-admin hover:underline">{t("about")}</a></li>
              <li><a href={`/${routing.defaultLocale}/originals`} className="inline-flex min-h-10 items-center underline-offset-4 hover:text-on-admin hover:underline">{t("viewSite")}</a></li>
              <li><LogoutForm label={t("logout")} /></li>
            </ul>
          </nav>
        </div>
      </div>
      {children}
    </>
  );
}
