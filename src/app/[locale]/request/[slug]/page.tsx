import type { Metadata } from "next";
import Image from "next/image";
import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { InquiryForm } from "@/components/InquiryForm";
import { toLocale } from "@/i18n/locale";
import { Link } from "@/i18n/navigation";
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
  return { title: t("metaTitle", { action, title: artwork.title }) };
}

/** Same layout as Contact, with the piece shown read-only above the form. */
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

  // The heading matches the action that led here.
  const { action } = getPriceView(artwork, settings);
  const cover = artwork.images[0];

  return (
    <div className="site-container pt-12 md:pt-16 lg:pt-20">
      <h1 className="heading-display">
        {action === "REQUEST" ? tArtwork("requestPiece") : tArtwork("askAboutPiece")}
      </h1>
      <p className="mt-6 max-w-prose leading-[1.65] text-muted">{t("intro")}</p>

      <section aria-label={t("pieceLabel")} className="mt-8 flex items-center gap-4">
        {cover && (
          <span className="relative block size-20 shrink-0">
            <Image src={cover.src} alt={cover.alt} fill sizes="5rem" className="object-contain" />
          </span>
        )}
        <Link href={`/originals/${artwork.slug}`} className="link">
          {artwork.title}
        </Link>
      </section>

      <div className="mt-10">
        <InquiryForm type="REQUEST" hidden={{ artworkSlug: artwork.slug }} />
      </div>
    </div>
  );
}
