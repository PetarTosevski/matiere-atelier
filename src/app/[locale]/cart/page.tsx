import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { PlaceholderPage } from "@/components/PlaceholderPage";
import { toLocale } from "@/i18n/locale";

export async function generateMetadata({
  params,
}: PageProps<"/[locale]/cart">): Promise<Metadata> {
  const locale = toLocale((await params).locale);
  const t = await getTranslations({ locale, namespace: "Cart" });
  return { title: t("metaTitle") };
}

// Placeholder: the cart list, subtotal and checkout come in the cart session.
export default async function CartPage({
  params,
}: PageProps<"/[locale]/cart">) {
  const locale = toLocale((await params).locale);
  setRequestLocale(locale);
  const t = await getTranslations("Cart");

  return (
    <PlaceholderPage title={t("title")}>
      <p>{t("empty")}</p>
    </PlaceholderPage>
  );
}
