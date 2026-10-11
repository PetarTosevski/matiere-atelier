"use client";

import Image from "next/image";
import { useTranslations } from "next-intl";
import { useRef, useState, type MouseEvent } from "react";
import { ImageViewer } from "@/components/ImageViewer";
import type { ArtworkImage } from "@/lib/types";

type Props = { title: string; images: ArtworkImage[] };

// Receives only what it displays. Never pass a whole Artwork to a client
// component: its props are serialized into the page and would carry the price.
export function ArtworkGallery({ title, images }: Props) {
  const t = useTranslations("Gallery");
  const [activeIndex, setActiveIndex] = useState(0);
  const [viewerOpen, setViewerOpen] = useState(false);
  // Whichever button opened the viewer gets focus back when it closes.
  const openerRef = useRef<HTMLButtonElement | null>(null);

  function openViewer(event: MouseEvent<HTMLButtonElement>) {
    openerRef.current = event.currentTarget;
    setViewerOpen(true);
  }

  const image = images[activeIndex] ?? images[0];
  if (!image) return null;

  return (
    <div>
      <button
        type="button"
        onClick={openViewer}
        aria-label={t("openImage", { alt: image.alt })}
        className="block w-full cursor-zoom-in"
      >
        {/* Sized to the image's own ratio: the whole piece is always visible. */}
        <span
          className="relative mx-auto block"
          style={{
            aspectRatio: `${image.width} / ${image.height}`,
            width: `min(100%, calc(80svh * ${image.width / image.height}))`,
          }}
        >
          <Image
            key={image.src}
            src={image.src}
            alt={image.alt}
            fill
            preload
            sizes="(min-width: 96rem) 52rem, (min-width: 64rem) 58vw, 100vw"
            className="object-contain"
          />
        </span>
      </button>

      <div className="mt-4 flex flex-wrap items-start justify-between gap-4">
        {images.length > 1 ? (
          <ul
            aria-label={t("thumbnailsLabel", { title })}
            className="flex flex-wrap gap-3"
          >
            {images.map((thumb, index) => (
              <li key={thumb.src}>
                <button
                  type="button"
                  onClick={() => setActiveIndex(index)}
                  aria-label={t("showImage", {
                    index: index + 1,
                    total: images.length,
                  })}
                  aria-current={index === activeIndex ? "true" : undefined}
                  className="relative block size-16 border border-transparent aria-[current]:border-ink sm:size-20"
                >
                  <Image
                    src={thumb.src}
                    alt={thumb.alt}
                    fill
                    sizes="5rem"
                    className="object-contain p-1"
                  />
                </button>
              </li>
            ))}
          </ul>
        ) : (
          <span />
        )}
        <button
          type="button"
          onClick={openViewer}
          className="link min-h-11 text-sm text-muted"
        >
          {t("viewFullScreen")}
        </button>
      </div>

      <ImageViewer
        title={title}
        images={images}
        index={activeIndex}
        onIndexChange={setActiveIndex}
        open={viewerOpen}
        onClose={() => {
          setViewerOpen(false);
          openerRef.current?.focus();
        }}
      />
    </div>
  );
}
