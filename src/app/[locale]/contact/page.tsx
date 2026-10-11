import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { InquiryForm } from "@/components/InquiryForm";
import { toLocale } from "@/i18n/locale";

export async function generateMetadata({
  params,
}: PageProps<"/[locale]/contact">): Promise<Metadata> {
  const locale = toLocale((await params).locale);
  const t = await getTranslations({ locale, namespace: "Contact" });
  return { title: t("metaTitle") };
}

export default async function ContactPage({
  params,
}: PageProps<"/[locale]/contact">) {
  const locale = toLocale((await params).locale);
  setRequestLocale(locale);
  const t = await getTranslations("Contact");

  return (
    <div className="site-container pt-2 md:pt-6">
      <h1 className="text-2xl tracking-tight md:text-3xl">{t("title")}</h1>
      <p className="mt-4 max-w-prose text-muted">{t("intro")}</p>
      <div className="mt-10">
        <InquiryForm type="CONTACT" />
      </div>
    </div>
  );
}
