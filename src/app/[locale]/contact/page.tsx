import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { InquiryForm } from "@/components/InquiryForm";
import { toLocale } from "@/i18n/locale";
import { STUDIO_EMAIL } from "@/lib/site";

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
    <div className="site-container pt-12 md:pt-16 lg:pt-20">
      <h1 className="heading-display">{t("title")}</h1>
      <p className="mt-6 max-w-prose leading-[1.65] text-muted">{t("intro")}</p>
      <p className="mt-3 max-w-prose leading-[1.65] text-muted">
        {t.rich("email", {
          address: STUDIO_EMAIL,
          email: (chunks) => (
            <a href={`mailto:${STUDIO_EMAIL}`} className="link text-ink">
              {chunks}
            </a>
          ),
        })}
      </p>
      <div className="mt-10">
        <InquiryForm type="CONTACT" />
      </div>
    </div>
  );
}
