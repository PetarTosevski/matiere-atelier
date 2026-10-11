import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { ArtworkBody } from "@/components/ArtworkBody";
import { toLocale } from "@/i18n/locale";
import { Link } from "@/i18n/navigation";
import { getArtworkBySlug, getPublishedSlugs } from "@/lib/artworks";
import { getArtworkMetadata } from "@/lib/metadata";
import { getPriceView } from "@/lib/pricing";
import { getSiteSettings } from "@/lib/settings";

export async function generateStaticParams() {
  const slugs = await getPublishedSlugs();
  return slugs.map((slug) => ({ slug }));
}

export async function generateMetadata({
  params,
}: PageProps<"/[locale]/originals/[slug]">): Promise<Metadata> {
  const { locale, slug } = await params;
  const artwork = await getArtworkBySlug(slug);
  if (!artwork) notFound();
  return getArtworkMetadata(artwork, toLocale(locale));
}

export default async function ArtworkPage({
  params,
}: PageProps<"/[locale]/originals/[slug]">) {
  const { locale: localeParam, slug } = await params;
  const locale = toLocale(localeParam);
  setRequestLocale(locale);

  const [t, artwork, settings] = await Promise.all([
    getTranslations("Artwork"),
    getArtworkBySlug(slug),
    getSiteSettings(),
  ]);
  if (!artwork) notFound();

  return (
    <div className="site-container">
      <Link href="/originals" className="link text-sm text-muted">
        {t("backToOriginals")}
      </Link>
      <ArtworkBody
        id={artwork.id}
        slug={artwork.slug}
        title={artwork.title}
        description={artwork.description}
        images={artwork.images}
        dimensions={artwork.dimensions}
        view={getPriceView(artwork, settings)}
      />
    </div>
  );
}
