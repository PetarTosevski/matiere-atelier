"use client";

import Image from "next/image";
import { useTranslations } from "next-intl";
import {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type KeyboardEvent,
  type MouseEvent,
  type PointerEvent,
} from "react";
import type { ArtworkImage } from "@/lib/types";

type Props = {
  title: string;
  images: ArtworkImage[];
  index: number;
  onIndexChange: (index: number) => void;
  open: boolean;
  onClose: () => void;
};

type Point = { x: number; y: number };

const clamp01 = (value: number) => Math.min(1, Math.max(0, value));

/**
 * Full-screen view so visitors can see the surface. "Fit to screen" shows the
 * whole piece; "Actual size" shows it at one image pixel per CSS pixel and can
 * be scrolled or dragged around. Built on <dialog>, so Esc closes it and
 * focus stays inside while it is open.
 */
export function ImageViewer({
  title,
  images,
  index,
  onIndexChange,
  open,
  onClose,
}: Props) {
  const t = useTranslations("Viewer");
  const dialogRef = useRef<HTMLDialogElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const toggleRef = useRef<HTMLButtonElement>(null);
  const [zoomed, setZoomed] = useState(false);
  const focalPoint = useRef<Point | null>(null);
  const drag = useRef<{ start: Point; scroll: Point; moved: boolean } | null>(
    null,
  );
  const dragged = useRef(false);

  const image = images[index];
  const count = images.length;

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (open && !dialog.open) {
      dialog.showModal();
      // Not autoFocus: React only renders that attribute on the server.
      closeRef.current?.focus();
    }
    if (!open && dialog.open) dialog.close();
  }, [open]);

  // After zooming in, centre the point that was clicked.
  useLayoutEffect(() => {
    const scroller = scrollRef.current;
    const point = focalPoint.current;
    if (!zoomed || !scroller || !point) return;
    scroller.scrollLeft = point.x * scroller.scrollWidth - scroller.clientWidth / 2;
    scroller.scrollTop = point.y * scroller.scrollHeight - scroller.clientHeight / 2;
    focalPoint.current = null;
  }, [zoomed, index]);

  if (!image) return null;

  function zoomInAt(point: Point) {
    focalPoint.current = point;
    setZoomed(true);
  }

  function zoomInAtClick(event: MouseEvent<HTMLImageElement>) {
    if (!image) return;
    // The fitted image is letterboxed inside its box (object-fit: contain).
    const box = event.currentTarget.getBoundingClientRect();
    const scale = Math.min(box.width / image.width, box.height / image.height);
    const width = image.width * scale;
    const height = image.height * scale;
    const left = box.left + (box.width - width) / 2;
    const top = box.top + (box.height - height) / 2;
    zoomInAt({
      x: clamp01((event.clientX - left) / width),
      y: clamp01((event.clientY - top) / height),
    });
  }

  // The zoomed scroller unmounts, so keep focus inside the dialog.
  function zoomOut() {
    if (scrollRef.current?.contains(document.activeElement)) {
      toggleRef.current?.focus();
    }
    setZoomed(false);
  }

  function zoomOutOnClick() {
    if (dragged.current) return;
    zoomOut();
  }

  function showImage(next: number) {
    if (next < 0 || next >= count) return;
    zoomOut();
    onIndexChange(next);
  }

  function onKeyDown(event: KeyboardEvent<HTMLDialogElement>) {
    // While zoomed, arrow keys scroll the image instead.
    if (zoomed || count < 2) return;
    if (event.key === "ArrowLeft") showImage(index - 1);
    if (event.key === "ArrowRight") showImage(index + 1);
  }

  // Drag to pan with a mouse; touch and trackpads scroll natively.
  function onPointerDown(event: PointerEvent<HTMLDivElement>) {
    const scroller = scrollRef.current;
    dragged.current = false;
    if (!zoomed || !scroller || event.pointerType !== "mouse") return;
    drag.current = {
      start: { x: event.clientX, y: event.clientY },
      scroll: { x: scroller.scrollLeft, y: scroller.scrollTop },
      moved: false,
    };
  }

  function onPointerMove(event: PointerEvent<HTMLDivElement>) {
    const scroller = scrollRef.current;
    const state = drag.current;
    if (!scroller || !state) return;
    const dx = event.clientX - state.start.x;
    const dy = event.clientY - state.start.y;
    if (!state.moved && Math.abs(dx) + Math.abs(dy) > 4) {
      state.moved = true;
      // Capture only once it is a drag, so a still click reaches the image.
      scroller.setPointerCapture(event.pointerId);
    }
    scroller.scrollLeft = state.scroll.x - dx;
    scroller.scrollTop = state.scroll.y - dy;
  }

  function onPointerUp(event: PointerEvent<HTMLDivElement>) {
    if (!drag.current) return;
    dragged.current = drag.current.moved;
    drag.current = null;
    if (scrollRef.current?.hasPointerCapture(event.pointerId)) {
      scrollRef.current.releasePointerCapture(event.pointerId);
    }
  }

  return (
    <dialog
      ref={dialogRef}
      aria-label={t("label", { title })}
      onClose={() => {
        setZoomed(false);
        onClose();
      }}
      onKeyDown={onKeyDown}
      className="m-0 h-dvh max-h-none w-dvw max-w-none overflow-hidden bg-paper p-0 text-ink"
    >
      <div className="flex h-full flex-col">
        <div className="flex items-center justify-between gap-4 px-4 py-3 sm:px-6">
          <p
            aria-live="polite"
            aria-atomic="true"
            className="text-sm text-muted tabular-nums"
          >
            {count > 1 && (
              <>
                <span aria-hidden="true">
                  {t("position", { index: index + 1, total: count })}
                </span>
                <span className="sr-only">
                  {t("positionWithAlt", {
                    index: index + 1,
                    total: count,
                    alt: image.alt,
                  })}
                </span>
              </>
            )}
          </p>
          <div className="flex items-center gap-2">
            <button
              ref={toggleRef}
              type="button"
              onClick={() =>
                zoomed ? zoomOut() : zoomInAt({ x: 0.5, y: 0.5 })
              }
              className="button-quiet"
            >
              {zoomed ? t("fitToScreen") : t("actualSize")}
            </button>
            <button
              ref={closeRef}
              type="button"
              onClick={() => dialogRef.current?.close()}
              className="button-quiet"
            >
              {t("close")}
            </button>
          </div>
        </div>

        {zoomed ? (
          <div
            ref={scrollRef}
            tabIndex={0}
            role="region"
            aria-label={t("zoomedRegion")}
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            onPointerCancel={onPointerUp}
            className="flex-1 cursor-grab overflow-auto overscroll-contain active:cursor-grabbing"
          >
            <div className="grid min-h-full w-max min-w-full place-items-center">
              <Image
                src={image.src}
                alt={image.alt}
                width={image.width}
                height={image.height}
                sizes={`${image.width}px`}
                draggable={false}
                onClick={zoomOutOnClick}
                className="max-w-none select-none"
                style={{ width: image.width, height: image.height }}
              />
            </div>
          </div>
        ) : (
          <div className="relative flex-1">
            <div className="absolute inset-0 px-4 pb-4 sm:px-6 sm:pb-6">
              <div className="relative size-full">
                <Image
                  key={image.src}
                  src={image.src}
                  alt={image.alt}
                  fill
                  sizes="100vw"
                  onClick={zoomInAtClick}
                  className="cursor-zoom-in object-contain"
                />
              </div>
            </div>
          </div>
        )}

        {count > 1 && (
          <div className="flex justify-center gap-2 px-4 pb-4">
            <button
              type="button"
              onClick={() => showImage(index - 1)}
              aria-disabled={index === 0 || undefined}
              className="button-quiet"
            >
              {t("previous")}
            </button>
            <button
              type="button"
              onClick={() => showImage(index + 1)}
              aria-disabled={index === count - 1 || undefined}
              className="button-quiet"
            >
              {t("next")}
            </button>
          </div>
        )}
      </div>
    </dialog>
  );
}
