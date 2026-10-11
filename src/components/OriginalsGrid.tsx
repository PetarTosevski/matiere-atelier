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
  preloadCount = 0,
  highlightId,
}: {
  items: GridItem[];
  preloadCount?: number;
  /** Outlines one piece (the admin preview's artwork). */
  highlightId?: string;
}) {
  return (
    <ul className="mt-8 grid grid-cols-2 gap-x-4 gap-y-10 sm:gap-x-8 md:mt-12 lg:grid-cols-3 lg:gap-x-8 lg:gap-y-16">
      {items.map((item, index) => (
        <li
          key={item.id}
          className={item.id === highlightId ? "outline-2 outline-offset-8 outline-ink outline-dashed" : undefined}
        >
          <ArtworkCard
            slug={item.slug}
            title={item.title}
            cover={item.cover}
            hover={item.hover}
            dimensions={item.dimensions}
            view={item.view}
            preload={index < preloadCount}
          />
        </li>
      ))}
    </ul>
  );
}
