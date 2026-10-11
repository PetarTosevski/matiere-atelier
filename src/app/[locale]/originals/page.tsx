import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { ArtworkCard } from "@/components/ArtworkCard";
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
    <div className="site-container pt-2 md:pt-6">
      <h1 className="text-2xl tracking-tight md:text-3xl">{t("title")}</h1>

      {artworks.length === 0 ? (
        <p className="mt-8 max-w-prose text-muted">
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
        <ul className="mt-8 grid grid-cols-2 gap-x-4 gap-y-10 sm:gap-x-8 md:mt-12 lg:grid-cols-3 lg:gap-x-8 lg:gap-y-16">
          {artworks.map((artwork, index) => (
            <li key={artwork.id}>
              <ArtworkCard
                slug={artwork.slug}
                title={artwork.title}
                cover={artwork.images[0]}
                view={getPriceView(artwork, settings)}
                preload={index < 3}
              />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
