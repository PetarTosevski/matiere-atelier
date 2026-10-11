"use client";

import Image from "next/image";
import { useTranslations } from "next-intl";
import { useId, useRef, type DragEvent } from "react";
import type { EditorImage } from "@/lib/collection-changes";

type Props = {
  images: EditorImage[];
  title: string;
  onChange: (images: EditorImage[]) => void;
  onRemove: (image: EditorImage) => void;
  onAdd: (files: FileList) => void;
  error?: string | null;
};

const inputClass = "mt-1 block w-full border border-control bg-paper in-data-[theme=light]:bg-field px-3 py-2 text-sm text-ink";

/** Every image of one piece: order (first is the cover), alt text, add and remove. */
export function ImagesField({ images, title, onChange, onRemove, onAdd, error }: Props) {
  const t = useTranslations("Admin.form");
  const id = useId();
  const dragIndex = useRef<number | null>(null);

  function move(from: number, to: number) {
    if (to < 0 || to >= images.length || from === to) return;
    const next = [...images];
    const [moved] = next.splice(from, 1);
    next.splice(to, 0, moved!);
    onChange(next);
  }

  function onDrop(event: DragEvent, to: number) {
    event.preventDefault();
    event.stopPropagation();
    if (dragIndex.current !== null) move(dragIndex.current, to);
    dragIndex.current = null;
  }

  return (
    <fieldset>
      <legend className="text-sm text-muted">{t("images")}</legend>
      <p id={`${id}-hint`} className="mt-1 text-xs text-faint">{t("imagesHint")}</p>
      {error && <p className="mt-2 text-sm text-warn">{error}</p>}

      {images.length > 0 && (
        <ol className="mt-3 space-y-3">
          {images.map((image, index) => (
            <li
              key={image.storageId}
              draggable
              onDragStart={(event) => {
                event.stopPropagation();
                dragIndex.current = index;
              }}
              onDragOver={(event) => event.preventDefault()}
              onDrop={(event) => onDrop(event, index)}
              aria-label={t("imageLabel", { index: index + 1, total: images.length })}
              className="flex gap-3 border border-line p-2"
            >
              <span className="relative block size-16 shrink-0 bg-paper">
                <Image src={image.src} alt="" fill sizes="4rem" className="object-contain" />
              </span>
              <div className="min-w-0 flex-1">
                {index === 0 && <p className="text-xs text-accent">{t("cover")}</p>}
                <label htmlFor={`${id}-alt-${index}`} className="block text-xs text-muted">{t("alt")}</label>
                <input
                  id={`${id}-alt-${index}`}
                  value={image.alt}
                  placeholder={title}
                  onChange={(event) => {
                    const alt = event.target.value;
                    onChange(images.map((item, i) => (i === index ? { ...item, alt } : item)));
                  }}
                  className={inputClass}
                />
                <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-xs">
                  {index > 0 && (
                    <button type="button" onClick={() => move(index, 0)} className="link min-h-8">
                      {t("makeCover")}
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => move(index, index - 1)}
                    disabled={index === 0}
                    aria-label={t("moveEarlierLabel", { index: index + 1 })}
                    className="link min-h-8 disabled:opacity-40"
                  >
                    {t("moveEarlier")}
                  </button>
                  <button
                    type="button"
                    onClick={() => move(index, index + 1)}
                    disabled={index === images.length - 1}
                    aria-label={t("moveLaterLabel", { index: index + 1 })}
                    className="link min-h-8 disabled:opacity-40"
                  >
                    {t("moveLater")}
                  </button>
                  <button
                    type="button"
                    onClick={() => onRemove(image)}
                    aria-label={t("removeLabel", { index: index + 1 })}
                    className="link min-h-8"
                  >
                    {t("remove")}
                  </button>
                </div>
              </div>
            </li>
          ))}
        </ol>
      )}

      <label className="mt-3 inline-flex min-h-11 cursor-pointer items-center border border-control px-4 text-sm font-semibold focus-within:outline-2 focus-within:outline-ink">
        {t("addImages")}
        <input
          type="file"
          multiple
          accept="image/jpeg,image/png,image/webp"
          aria-describedby={`${id}-hint`}
          onChange={(event) => {
            if (event.target.files) onAdd(event.target.files);
            event.target.value = "";
          }}
          className="sr-only"
        />
      </label>
    </fieldset>
  );
}
