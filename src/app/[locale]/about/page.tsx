import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { toLocale } from "@/i18n/locale";

export async function generateMetadata({
  params,
}: PageProps<"/[locale]/about">): Promise<Metadata> {
  const locale = toLocale((await params).locale);
  const t = await getTranslations({ locale, namespace: "About" });
  return { title: t("metaTitle") };
}

// Portrait and bio are placeholders until the artist provides them.
export default async function AboutPage({
  params,
}: PageProps<"/[locale]/about">) {
  const locale = toLocale((await params).locale);
  setRequestLocale(locale);
  const t = await getTranslations("About");

  return (
    <div className="site-container pt-12 md:pt-16 lg:pt-20">
      <h1 className="heading-display">{t("title")}</h1>
      <div className="mt-10 grid gap-10 md:grid-cols-[minmax(0,2fr)_minmax(0,3fr)] md:gap-16">
        <div
          role="img"
          aria-label={t("portraitLabel")}
          className="aspect-[4/5] w-full max-w-md bg-panel"
        />
        <div className="max-w-prose space-y-4 leading-[1.65] text-muted">
          <p>{t("bio1")}</p>
          <p>{t("bio2")}</p>
        </div>
      </div>
    </div>
  );
}
