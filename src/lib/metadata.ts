import type { Metadata } from "next";
import { excerpt, markdownToPlainText } from "@/lib/markdown";
import { SITE_NAME } from "@/lib/site";
import type { Artwork } from "@/lib/types";

/** Shared by the layout and pages, since Next replaces openGraph per segment. */
export function baseOpenGraph(locale: string) {
  return { siteName: SITE_NAME, locale };
}

/**
 * Metadata for an artwork page. Prices are never included here, so a hidden
 * price can't leak through the title, description or Open Graph tags.
 */
export function getArtworkMetadata(
  artwork: Pick<Artwork, "title" | "description" | "images">,
  locale: string,
): Metadata {
  const description = excerpt(markdownToPlainText(artwork.description));
  const cover = artwork.images[0];

  return {
    title: artwork.title,
    description,
    openGraph: {
      ...baseOpenGraph(locale),
      type: "website",
      title: artwork.title,
      description,
      images: cover
        ? [
            {
              url: cover.src,
              width: cover.width,
              height: cover.height,
              alt: cover.alt,
            },
          ]
        : undefined,
    },
  };
}
