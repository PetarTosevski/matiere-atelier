import { ArtworkDetails } from "@/components/ArtworkDetails";
import { ArtworkGallery } from "@/components/ArtworkGallery";
import type { PriceView } from "@/lib/pricing";
import type { ArtworkImage, Dimensions } from "@/lib/types";

type Props = {
  id: string;
  slug: string;
  title: string;
  description: string;
  images: ArtworkImage[];
  dimensions: Dimensions | null;
  view: PriceView;
};

/** Images left, details right. Shared by the artwork page and the admin preview. */
export function ArtworkBody({ id, slug, title, description, images, dimensions, view }: Props) {
  return (
    <div className="mt-6 grid gap-10 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)] lg:gap-16">
      <ArtworkGallery title={title} images={images} />
      <ArtworkDetails
        id={id}
        slug={slug}
        title={title}
        description={description}
        dimensions={dimensions}
        view={view}
      />
    </div>
  );
}
