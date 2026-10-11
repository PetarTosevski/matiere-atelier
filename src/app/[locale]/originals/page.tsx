import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { OriginalsGrid } from "@/components/OriginalsGrid";
import { OriginalsIntro } from "@/components/OriginalsIntro";
import { toLocale } from "@/i18n/locale";
import { Link } from "@/i18n/navigation";
import { getPublishedArtworks } from "@/lib/artworks";
import { getPriceView } from "@/lib/pricing";
import { getSiteSettings } from "@/lib/settings";

export async function generateMetadata({
  params,
}: PageProps<"/[locale]/originals">): Promise<Metadata> {
  const locale = toLocale((await params).locale);
  const t = await getTranslations({ locale, namespace: "Originals" });
  return { title: t("metaTitle") };
}

export default async function OriginalsPage({
  params,
}: PageProps<"/[locale]/originals">) {
  const locale = toLocale((await params).locale);
  setRequestLocale(locale);

  const [t, artworks, settings] = await Promise.all([
    getTranslations("Originals"),
    getPublishedArtworks(),
    getSiteSettings(),
  ]);

  return (
    <div className="site-container">
      <OriginalsIntro />

      {artworks.length === 0 ? (
        <p className="max-w-prose text-muted">
          {t.rich("empty", {
            commissions: (chunks) => (
              <Link href="/commissions" className="link text-ink">
                {chunks}
              </Link>
            ),
            contact: (chunks) => (
              <Link href="/contact" className="link text-ink">
                {chunks}
              </Link>
            ),
          })}
        </p>
      ) : (
        <OriginalsGrid
          label={t("listLabel")}
          preloadCount={2}
          items={artworks.map((artwork) => ({
            id: artwork.id,
            slug: artwork.slug,
            title: artwork.title,
            cover: artwork.images[0],
            hover: artwork.images[1],
            dimensions: artwork.dimensions,
            view: getPriceView(artwork, settings),
          }))}
        />
      )}
    </div>
  );
}
