import Image from "next/image";
import { useTranslations } from "next-intl";
import { AvailabilityLabel, FormattedPrice } from "@/components/PriceInfo";
import { Link } from "@/i18n/navigation";
import type { PriceView } from "@/lib/pricing";
import type { ArtworkImage } from "@/lib/types";

type Props = {
  slug: string;
  title: string;
  cover: ArtworkImage | undefined;
  view: PriceView;
  /** Position on the grid, shown as "01", "02"… */
  number: number;
  preload?: boolean;
};

/**
 * A grid card: the cover hangs on its own panel at its own proportions,
 * never cropped. The whole card links to the artwork page.
 */
export function ArtworkCard({ slug, title, cover, view, number, preload }: Props) {
  const t = useTranslations("Artwork");
  // Name the link by title, price and availability, not the long alt text.
  const titleId = `card-${slug}-title`;
  const priceId = `card-${slug}-price`;
  const metaId = `card-${slug}-meta`;
  const labelledBy = [titleId, view.price ? priceId : null, metaId]
    .filter(Boolean)
    .join(" ");

  return (
    <Link
      href={`/originals/${slug}`}
      aria-labelledby={labelledBy}
      className="group flex h-full flex-col gap-6 bg-panel px-5 pt-8 pb-6 md:px-6 md:pt-10 lg:gap-8 lg:px-11 lg:pt-13 lg:pb-9"
    >
      {/* Each piece keeps its own proportions, like a work hung on a wall. */}
      <div className="flex min-h-70 flex-1 items-center justify-center lg:min-h-90">
        {cover && (
          <Image
            src={cover.src}
            alt={cover.alt}
            width={cover.width}
            height={cover.height}
            sizes="(min-width: 48rem) 42vw, 86vw"
            preload={preload}
            className="h-auto max-h-[22rem] w-auto max-w-full lg:max-h-[26rem]"
          />
        )}
      </div>

      <div className="mt-auto flex flex-col gap-4 border-t border-line pt-5 lg:flex-row lg:items-start lg:gap-5.5 lg:pt-5.5">
        <div className="flex flex-1 items-start gap-4">
          <span
            aria-hidden="true"
            className="font-serif text-[2.25rem] leading-[0.9] text-accent italic lg:text-[2.625rem]"
          >
            {String(number).padStart(2, "0")}
          </span>
          <div className="flex min-w-0 flex-col gap-1 lg:gap-1.5">
            <h2
              id={titleId}
              className="font-serif text-2xl font-medium underline-offset-4 group-hover:underline lg:text-[1.6875rem]"
            >
              {title}
            </h2>
            <p id={metaId} className="text-sm text-muted">
              <AvailabilityLabel availability={view.availability} />
            </p>
          </div>
        </div>

        <div className="flex items-center justify-between gap-3 lg:flex-col lg:items-end lg:gap-2.5">
          {view.price && (
            <span id={priceId} className="font-semibold text-ink">
              <FormattedPrice price={view.price} />
            </span>
          )}
          {/* A visual cue only: the whole card is the link. */}
          <span
            aria-hidden="true"
            className="button-primary ml-auto whitespace-nowrap group-hover:bg-accent group-hover:text-paper lg:ml-0"
          >
            {t("viewPiece")}
          </span>
        </div>
      </div>
    </Link>
  );
}
