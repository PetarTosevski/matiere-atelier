import Image from "next/image";
import { useTranslations } from "next-intl";
import { AvailabilityLabel, FormattedPrice } from "@/components/PriceInfo";
import { Link } from "@/i18n/navigation";
import type { PriceView } from "@/lib/pricing";
import type { ArtworkImage, Dimensions } from "@/lib/types";

type Props = {
  slug: string;
  title: string;
  cover: ArtworkImage | undefined;
  /** Shown on hover or keyboard focus, ideally a close-up of the surface. */
  hover?: ArtworkImage;
  dimensions: Dimensions | null;
  view: PriceView;
  preload?: boolean;
};

const IMAGE_SIZES = "(min-width: 84rem) 21rem, (min-width: 64rem) 23vw, 42vw";

/** A grid card. The cover sits in a uniform frame and is never cropped. */
export function ArtworkCard({ slug, title, cover, hover, dimensions, view, preload }: Props) {
  const t = useTranslations("Artwork");
  // Name the link by title, size, price and availability, not the long alt text.
  const titleId = `card-${slug}-title`;
  const sizeId = `card-${slug}-size`;
  const metaId = `card-${slug}-meta`;
  const swap = Boolean(cover && hover);

  return (
    <Link
      href={`/originals/${slug}`}
      aria-labelledby={[titleId, dimensions ? sizeId : null, metaId].filter(Boolean).join(" ")}
      className="group block"
    >
      <div className="relative aspect-frame">
        {cover && (
          <div className="absolute inset-[7%]">
            <Image
              src={cover.src}
              alt={cover.alt}
              fill
              sizes={IMAGE_SIZES}
              preload={preload}
              className={`object-contain ${
                swap ? "transition-opacity duration-300 group-hover:opacity-0 group-focus-visible:opacity-0" : ""
              }`}
            />
            {hover && (
              // The close-up repeats the same piece, so screen readers skip it.
              <Image
                src={hover.src}
                alt=""
                aria-hidden="true"
                fill
                sizes={IMAGE_SIZES}
                className="object-contain opacity-0 transition-opacity duration-300 group-hover:opacity-100 group-focus-visible:opacity-100"
              />
            )}
          </div>
        )}
      </div>
      <div className="mt-4">
        <h2 id={titleId} className="text-base underline-offset-4 group-hover:underline sm:text-lg lg:text-xl">
          {title}
        </h2>
        {dimensions && (
          <p id={sizeId} className="mt-1 text-sm text-muted sm:text-base">
            {t("dimensions", dimensions)}
          </p>
        )}
        <p id={metaId} className="mt-1 flex flex-wrap gap-x-3 text-sm text-muted sm:text-base">
          {view.price && (
            <span className="text-ink">
              <FormattedPrice price={view.price} />
            </span>
          )}
          <span>
            <AvailabilityLabel availability={view.availability} />
          </span>
        </p>
      </div>
    </Link>
  );
}
