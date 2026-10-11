import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { CartView } from "@/components/cart/CartView";
import { toLocale } from "@/i18n/locale";
import { isCartEnabled } from "@/lib/pricing";
import { getSiteSettings } from "@/lib/settings";

export async function generateMetadata({
  params,
}: PageProps<"/[locale]/cart">): Promise<Metadata> {
  const locale = toLocale((await params).locale);
  const t = await getTranslations({ locale, namespace: "Cart" });
  return { title: t("metaTitle"), robots: { index: false } };
}

export default async function CartPage({
  params,
}: PageProps<"/[locale]/cart">) {
  const locale = toLocale((await params).locale);
  setRequestLocale(locale);
  const [t, settings] = await Promise.all([
    getTranslations("Cart"),
    getSiteSettings(),
  ]);
  // Showcase mode has no cart.
  if (!isCartEnabled(settings)) notFound();

  return (
    <div className="site-container pt-12 md:pt-16 lg:pt-20">
      <h1 className="heading-display">{t("title")}</h1>
      <CartView />
    </div>
  );
}
