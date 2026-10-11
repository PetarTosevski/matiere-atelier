import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { getPreviewContext } from "@/app/admin/preview-context";
import { ArtworkForm } from "@/components/admin/ArtworkForm";
import { routing } from "@/i18n/routing";
import { requireAdminPage } from "@/lib/auth";

const locale = routing.defaultLocale;

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations({ locale, namespace: "Admin.form" });
  return { title: t("newTitle") };
}

export default async function NewArtworkPage() {
  await requireAdminPage();
  const [t, preview] = await Promise.all([
    getTranslations({ locale, namespace: "Admin.form" }),
    getPreviewContext(null),
  ]);

  return (
    <div>
      <h1 className="text-2xl tracking-tight md:text-3xl">{t("newTitle")}</h1>
      <ArtworkForm artwork={null} preview={preview} />
    </div>
  );
}
