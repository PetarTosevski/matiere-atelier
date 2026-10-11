import Image from "next/image";
import { AvailabilityLabel, FormattedPrice } from "@/components/PriceInfo";
import { Link } from "@/i18n/navigation";
import type { PriceView } from "@/lib/pricing";
import type { ArtworkImage } from "@/lib/types";

type Props = {
  slug: string;
  title: string;
  cover: ArtworkImage | undefined;
  view: PriceView;
  preload?: boolean;
};

/** A grid card. The cover sits in a uniform frame and is never cropped. */
export function ArtworkCard({ slug, title, cover, view, preload }: Props) {
  // Name the link by title, price and availability, not the long alt text.
  const titleId = `card-${slug}-title`;
  const metaId = `card-${slug}-meta`;

  return (
    <Link
      href={`/originals/${slug}`}
      aria-labelledby={`${titleId} ${metaId}`}
      className="group block"
    >
      <div className="relative aspect-frame">
        {cover && (
          <div className="absolute inset-[7%]">
            <Image
              src={cover.src}
              alt={cover.alt}
              fill
              sizes="(min-width: 96rem) 25rem, (min-width: 64rem) 27vw, 42vw"
              preload={preload}
              className="object-contain"
            />
          </div>
        )}
      </div>
      <div className="mt-3 text-sm sm:text-base">
        <h2 id={titleId} className="underline-offset-4 group-hover:underline">{title}</h2>
        <p id={metaId} className="mt-0.5 flex flex-wrap gap-x-3 text-muted">
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
