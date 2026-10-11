import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { SettingsForm } from "@/components/admin/SettingsForm";
import { routing } from "@/i18n/routing";
import { requireAdminPage } from "@/lib/auth";
import { getSiteSettings } from "@/lib/settings";

const locale = routing.defaultLocale;

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations({ locale, namespace: "Admin.settings" });
  return { title: t("title") };
}

export default async function AdminSettingsPage() {
  await requireAdminPage();
  const [t, settings] = await Promise.all([
    getTranslations({ locale, namespace: "Admin.settings" }),
    getSiteSettings(),
  ]);

  return (
    <div className="max-w-prose">
      <h1 className="text-2xl tracking-tight md:text-3xl">{t("title")}</h1>
      <SettingsForm showPrices={settings.showPrices} />
    </div>
  );
}
