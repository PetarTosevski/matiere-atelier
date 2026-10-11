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
  /** Position on the grid, shown as "01", "02"… */
  number: number;
  preload?: boolean;
};

const IMAGE_SIZES = "(min-width: 80rem) 28vw, (min-width: 48rem) 42vw, 86vw";

/**
 * A grid card: the cover hangs on its own panel at its own proportions,
 * never cropped. The whole card links to the artwork page.
 */
export function ArtworkCard({
  slug,
  title,
  cover,
  hover,
  dimensions,
  view,
  number,
  preload,
}: Props) {
  const t = useTranslations("Artwork");
  // Name the link by title, price, size and availability, not the long alt text.
  const titleId = `card-${slug}-title`;
  const priceId = `card-${slug}-price`;
  const sizeId = `card-${slug}-size`;
  const metaId = `card-${slug}-meta`;
  const labelledBy = [
    titleId,
    view.price ? priceId : null,
    dimensions ? sizeId : null,
    metaId,
  ]
    .filter(Boolean)
    .join(" ");
  const swap = Boolean(cover && hover);

  return (
    <Link
      href={`/originals/${slug}`}
      aria-labelledby={labelledBy}
      className="group flex h-full flex-col gap-6 bg-panel px-5 pt-8 pb-6 md:px-6 md:pt-10 lg:gap-8 lg:px-11 lg:pt-13 lg:pb-9 xl:gap-6 xl:px-7 xl:pt-9 xl:pb-7"
    >
      {/* Each piece keeps its own proportions, like a work hung on a wall. */}
      <div className="flex min-h-70 flex-1 items-center justify-center lg:min-h-90 xl:min-h-72">
        {cover && (
          <div className="relative">
            <Image
              src={cover.src}
              alt={cover.alt}
              width={cover.width}
              height={cover.height}
              sizes={IMAGE_SIZES}
              preload={preload}
              className={`block h-auto max-h-[22rem] w-auto max-w-full lg:max-h-[26rem] xl:max-h-[19rem] ${
                swap
                  ? "transition-opacity duration-300 group-hover:opacity-0 group-focus-visible:opacity-0"
                  : ""
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

      <div className="flex flex-col gap-4 border-t border-line pt-5 lg:flex-row lg:items-start lg:gap-5.5 lg:pt-5.5 xl:flex-col xl:items-stretch xl:gap-4">
        <div className="flex flex-1 items-start gap-4">
          <span
            aria-hidden="true"
            className="font-serif text-[2.25rem] leading-[0.9] text-accent italic lg:text-[2.625rem] xl:text-[2.25rem]"
          >
            {String(number).padStart(2, "0")}
          </span>
          <div className="flex min-w-0 flex-col gap-1 lg:gap-1.5">
            <h2
              id={titleId}
              className="font-serif text-2xl font-medium underline-offset-4 group-hover:underline lg:text-[1.6875rem] xl:text-2xl"
            >
              {title}
            </h2>
            <p className="text-sm text-muted">
              {dimensions && (
                <>
                  <span id={sizeId}>{t("dimensions", dimensions)}</span>
                  <span aria-hidden="true"> · </span>
                </>
              )}
              <span id={metaId}>
                <AvailabilityLabel availability={view.availability} />
              </span>
            </p>
          </div>
        </div>

        <div className="flex items-center justify-between gap-3 lg:flex-col lg:items-end lg:gap-2.5 xl:flex-row xl:items-center xl:gap-3">
          {view.price && (
            <span id={priceId} className="font-semibold text-ink">
              <FormattedPrice price={view.price} />
            </span>
          )}
          {/* A visual cue only: the whole card is the link. */}
          <span
            aria-hidden="true"
            className="button-primary ml-auto whitespace-nowrap group-hover:bg-accent group-hover:text-paper lg:ml-0 xl:ml-auto"
          >
            {t("viewPiece")}
          </span>
        </div>
      </div>
    </Link>
  );
}
