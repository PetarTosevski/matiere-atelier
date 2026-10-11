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
    <div className="site-container">
      <section className="flex flex-col gap-5 pt-14 pb-12 md:gap-6 md:pt-20 md:pb-16 lg:flex-row lg:items-end lg:justify-between lg:gap-16 lg:pt-22 lg:pb-18">
        <h1 className="font-serif text-display font-normal">
          {t.rich("title", {
            em: (chunks) => <em className="text-accent">{chunks}</em>,
          })}
        </h1>
        <p className="max-w-[32.5rem] leading-[1.65] text-muted md:text-[1.0625rem] lg:w-[22.5rem] lg:max-w-none lg:shrink-0">
          {t("intro")}
        </p>
      </section>

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
        <ul
          aria-label={t("listLabel")}
          className="grid gap-4 md:grid-cols-2 md:gap-5 lg:gap-7"
        >
          {artworks.map((artwork, index) => (
            <li key={artwork.id}>
              <ArtworkCard
                slug={artwork.slug}
                title={artwork.title}
                cover={artwork.images[0]}
                view={getPriceView(artwork, settings)}
                number={index + 1}
                preload={index < 2}
              />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
