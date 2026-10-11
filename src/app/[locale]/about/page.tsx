import type { Metadata } from "next";
import Image from "next/image";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Markdown } from "@/components/Markdown";
import { toLocale } from "@/i18n/locale";
import { excerpt, markdownToPlainText } from "@/lib/markdown";
import { getAboutPage } from "@/lib/pages";

export async function generateMetadata({
  params,
}: PageProps<"/[locale]/about">): Promise<Metadata> {
  const locale = toLocale((await params).locale);
  const [t, about] = await Promise.all([
    getTranslations({ locale, namespace: "About" }),
    getAboutPage(),
  ]);
  return {
    title: t("metaTitle"),
    description: about?.bio.trim() ? excerpt(markdownToPlainText(about.bio)) : undefined,
  };
}

// The artist edits the portrait and text in the admin (/admin/about). Until
// she saves them, the placeholders from messages/en.json are shown.
export default async function AboutPage({
  params,
}: PageProps<"/[locale]/about">) {
  const locale = toLocale((await params).locale);
  setRequestLocale(locale);
  const [t, about] = await Promise.all([getTranslations("About"), getAboutPage()]);
  const portrait = about?.portrait ?? null;
  const bio = about?.bio.trim() ? about.bio : null;

  return (
    <div className="site-container pt-12 md:pt-16 lg:pt-20">
      <h1 className="heading-display">{t("title")}</h1>
      <div className="mt-10 grid gap-10 md:grid-cols-[minmax(0,2fr)_minmax(0,3fr)] md:gap-16">
        {portrait ? (
          <div className="relative aspect-[4/5] w-full max-w-md">
            <Image
              src={portrait.src}
              alt={portrait.alt}
              fill
              preload
              sizes="(min-width: 48rem) 28rem, 100vw"
              className="object-contain"
            />
          </div>
        ) : (
          <div
            role="img"
            aria-label={t("portraitLabel")}
            className="aspect-[4/5] w-full max-w-md bg-panel"
          />
        )}
        {bio ? (
          <Markdown className="prose-description max-w-prose text-muted [&_strong]:text-ink">{bio}</Markdown>
        ) : (
          <div className="max-w-prose space-y-4 leading-[1.65] text-muted">
            <p>{t("bio1")}</p>
            <p>{t("bio2")}</p>
          </div>
        )}
      </div>
    </div>
  );
}
