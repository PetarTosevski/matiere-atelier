import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { PlaceholderPage } from "@/components/PlaceholderPage";
import { toLocale } from "@/i18n/locale";

export async function generateMetadata({
  params,
}: PageProps<"/[locale]/contact">): Promise<Metadata> {
  const locale = toLocale((await params).locale);
  const t = await getTranslations({ locale, namespace: "Contact" });
  return { title: t("metaTitle") };
}

// Placeholder: the contact form comes in a later session.
export default async function ContactPage({
  params,
}: PageProps<"/[locale]/contact">) {
  const locale = toLocale((await params).locale);
  setRequestLocale(locale);
  const [t, tPlaceholder] = await Promise.all([
    getTranslations("Contact"),
    getTranslations("Placeholder"),
  ]);

  return (
    <PlaceholderPage title={t("title")}>
      <p>{tPlaceholder("comingSoon")}</p>
    </PlaceholderPage>
  );
}
