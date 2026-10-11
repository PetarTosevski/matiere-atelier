import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { PlaceholderPage } from "@/components/PlaceholderPage";
import { toLocale } from "@/i18n/locale";

export async function generateMetadata({
  params,
}: PageProps<"/[locale]/about">): Promise<Metadata> {
  const locale = toLocale((await params).locale);
  const t = await getTranslations({ locale, namespace: "About" });
  return { title: t("metaTitle") };
}

// Placeholder: the portrait and bio come in a later session.
export default async function AboutPage({
  params,
}: PageProps<"/[locale]/about">) {
  const locale = toLocale((await params).locale);
  setRequestLocale(locale);
  const [t, tPlaceholder] = await Promise.all([
    getTranslations("About"),
    getTranslations("Placeholder"),
  ]);

  return (
    <PlaceholderPage title={t("title")}>
      <p>{tPlaceholder("comingSoon")}</p>
    </PlaceholderPage>
  );
}
