import type { Metadata } from "next";
import Image from "next/image";
import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { PlaceholderPage } from "@/components/PlaceholderPage";
import { toLocale } from "@/i18n/locale";
import { getArtworkBySlug, getPublishedSlugs } from "@/lib/artworks";
import { getPriceView } from "@/lib/pricing";
import { getSiteSettings } from "@/lib/settings";

export async function generateStaticParams() {
  const slugs = await getPublishedSlugs();
  return slugs.map((slug) => ({ slug }));
}

export async function generateMetadata({
  params,
}: PageProps<"/[locale]/request/[slug]">): Promise<Metadata> {
  const { locale: localeParam, slug } = await params;
  const locale = toLocale(localeParam);
  const [t, artwork, settings] = await Promise.all([
    getTranslations({ locale, namespace: "Request" }),
    getArtworkBySlug(slug),
    getSiteSettings(),
  ]);
  if (!artwork) notFound();
  const { action } = getPriceView(artwork, settings);
  return {
    title: t("metaTitle", { action, title: artwork.title }),
  };
}

// Placeholder: the request form (name, email, message) comes in the forms
// session. The heading matches the action that led here.
export default async function RequestPage({
  params,
}: PageProps<"/[locale]/request/[slug]">) {
  const { locale: localeParam, slug } = await params;
  const locale = toLocale(localeParam);
  setRequestLocale(locale);

  const [t, tArtwork, artwork, settings] = await Promise.all([
    getTranslations("Request"),
    getTranslations("Artwork"),
    getArtworkBySlug(slug),
    getSiteSettings(),
  ]);
  if (!artwork) notFound();

  const { action } = getPriceView(artwork, settings);
  const cover = artwork.images[0];

  return (
    <PlaceholderPage
      title={
        action === "REQUEST"
          ? tArtwork("requestPiece")
          : tArtwork("askAboutPiece")
      }
    >
      <div className="flex items-center gap-4 text-ink">
        {cover && (
          <span className="relative block size-20 shrink-0">
            <Image
              src={cover.src}
              alt={cover.alt}
              fill
              sizes="5rem"
              className="object-contain p-1"
            />
          </span>
        )}
        <p>{artwork.title}</p>
      </div>
      <p className="mt-8">{t("comingSoon")}</p>
    </PlaceholderPage>
  );
}
