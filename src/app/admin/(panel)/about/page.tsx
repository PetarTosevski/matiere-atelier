import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { AboutForm } from "@/components/admin/AboutForm";
import { routing } from "@/i18n/routing";
import { requireAdminPage } from "@/lib/auth";
import { getAboutPageForAdmin } from "@/lib/pages";

const locale = routing.defaultLocale;

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations({ locale, namespace: "Admin.about" });
  return { title: t("title") };
}

export default async function AdminAboutPage() {
  await requireAdminPage();
  const [t, tAbout, about] = await Promise.all([
    getTranslations({ locale, namespace: "Admin.about" }),
    getTranslations({ locale, namespace: "About" }),
    getAboutPageForAdmin(),
  ]);

  return (
    <main className="site-container py-10 md:py-14">
      <h1 className="heading-display">{t("title")}</h1>
      <p className="mt-4 max-w-prose text-muted">{t("intro")}</p>
      <AboutForm about={about} placeholderBio={`${tAbout("bio1")}\n\n${tAbout("bio2")}`} />
    </main>
  );
}
