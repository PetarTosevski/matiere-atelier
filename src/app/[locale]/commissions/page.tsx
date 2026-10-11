import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { PlaceholderPage } from "@/components/PlaceholderPage";
import { toLocale } from "@/i18n/locale";

export async function generateMetadata({
  params,
}: PageProps<"/[locale]/commissions">): Promise<Metadata> {
  const locale = toLocale((await params).locale);
  const t = await getTranslations({ locale, namespace: "Commissions" });
  return { title: t("metaTitle") };
}

// Placeholder: the intro copy and commission form come in a later session.
export default async function CommissionsPage({
  params,
}: PageProps<"/[locale]/commissions">) {
  const locale = toLocale((await params).locale);
  setRequestLocale(locale);
  const [t, tPlaceholder] = await Promise.all([
    getTranslations("Commissions"),
    getTranslations("Placeholder"),
  ]);

  return (
    <PlaceholderPage title={t("title")}>
      <p>{tPlaceholder("comingSoon")}</p>
    </PlaceholderPage>
  );
}
