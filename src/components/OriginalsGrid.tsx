import { ArtworkCard } from "@/components/ArtworkCard";
import type { PriceView } from "@/lib/pricing";
import type { ArtworkImage, Dimensions } from "@/lib/types";

export type GridItem = {
  id: string;
  slug: string;
  title: string;
  cover: ArtworkImage | undefined;
  /** The second image, shown on hover. */
  hover?: ArtworkImage;
  dimensions: Dimensions | null;
  view: PriceView;
};

/** The Originals grid. Shared by the page and the admin preview. */
export function OriginalsGrid({
  items,
  label,
  preloadCount = 0,
  highlightId,
}: {
  items: GridItem[];
  /** Accessible name for the list. */
  label?: string;
  preloadCount?: number;
  /** Outlines one piece (the admin preview's artwork). */
  highlightId?: string;
}) {
  return (
    <ul aria-label={label} className="grid gap-4 md:grid-cols-2 md:gap-5 lg:gap-7">
      {items.map((item, index) => (
        <li
          key={item.id}
          className={item.id === highlightId ? "outline-2 outline-offset-4 outline-accent outline-dashed" : undefined}
        >
          <ArtworkCard
            slug={item.slug}
            title={item.title}
            cover={item.cover}
            hover={item.hover}
            dimensions={item.dimensions}
            view={item.view}
            number={index + 1}
            preload={index < preloadCount}
          />
        </li>
      ))}
    </ul>
  );
}
