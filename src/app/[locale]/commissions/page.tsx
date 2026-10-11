import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { InquiryForm } from "@/components/InquiryForm";
import { toLocale } from "@/i18n/locale";

export async function generateMetadata({
  params,
}: PageProps<"/[locale]/commissions">): Promise<Metadata> {
  const locale = toLocale((await params).locale);
  const t = await getTranslations({ locale, namespace: "Commissions" });
  return { title: t("metaTitle") };
}

// The intro copy is a placeholder until the artist provides her own text.
export default async function CommissionsPage({
  params,
}: PageProps<"/[locale]/commissions">) {
  const locale = toLocale((await params).locale);
  setRequestLocale(locale);
  const t = await getTranslations("Commissions");

  return (
    <div className="site-container pt-2 md:pt-6">
      <h1 className="text-2xl tracking-tight md:text-3xl">{t("title")}</h1>
      <div className="mt-4 max-w-prose space-y-4 text-muted">
        <p>{t("intro")}</p>
        <p>{t("process")}</p>
      </div>
      <div className="mt-10">
        <InquiryForm type="COMMISSION" />
      </div>
    </div>
  );
}
