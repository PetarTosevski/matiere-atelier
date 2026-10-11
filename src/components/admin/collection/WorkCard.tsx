"use client";

import Image from "next/image";
import { useTranslations } from "next-intl";
import type { DragEvent } from "react";
import type { EditorWork } from "@/lib/collection-changes";
import { formatPrice } from "@/lib/format";
import { parseAmount } from "@/lib/money";

type Props = {
  work: EditorWork;
  index: number;
  total: number;
  currency: string;
  selected: boolean;
  needsAttention: boolean;
  dragging: boolean;
  dropTarget: boolean;
  onMove: (to: number) => void;
  onEdit: (button: HTMLButtonElement) => void;
  onDragStart: (event: DragEvent) => void;
  onDragOver: (event: DragEvent) => void;
  onDragLeave: () => void;
  onDrop: (event: DragEvent) => void;
  onDragEnd: () => void;
};

/**
 * A piece as the collection page shows it, with the admin controls on top:
 * drag handle, earlier/later and Edit. Mirrors the storefront ArtworkCard.
 */
export function WorkCard({
  work,
  index,
  total,
  currency,
  selected,
  needsAttention,
  dragging,
  dropTarget,
  onMove,
  onEdit,
  onDragStart,
  onDragOver,
  onDragLeave,
  onDrop,
  onDragEnd,
}: Props) {
  const t = useTranslations("Admin.collection");
  const tArtwork = useTranslations("Artwork");
  const title = work.title.trim() || t("untitled");
  const cover = work.images[0];
  const amount = work.amount.trim() ? parseAmount(work.amount) : null;

  const price =
    work.priceMode !== "PRICE"
      ? { label: t("displayOnly"), warn: false }
      : !work.amount.trim()
        ? { label: t("noPrice"), warn: true }
        : amount === null
          ? { label: t("checkPrice"), warn: true }
          : { label: formatPrice(amount, currency, "en"), warn: false };

  const width = Number(work.width.replace(",", "."));
  const height = Number(work.height.replace(",", "."));
  const size = width > 0 && height > 0 ? tArtwork("dimensions", { width, height }) : null;

  const outline = dropTarget
    ? "outline-2 outline-dashed outline-accent"
    : selected
      ? "outline-2 outline-accent"
      : needsAttention
        ? "outline-2 outline-warn"
        : "";

  return (
    <article
      draggable
      onDragStart={onDragStart}
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
      onDragEnd={onDragEnd}
      aria-label={title}
      className={`flex h-full cursor-grab flex-col gap-6 bg-panel px-5 pt-3 pb-6 outline-offset-4 active:cursor-grabbing md:px-6 lg:gap-7 lg:px-11 lg:pb-9 ${outline} ${
        dragging ? "opacity-35" : ""
      }`}
    >
      <div className="-mx-2 flex flex-wrap items-center justify-between gap-2 border-b border-dashed border-control/70 pb-3 lg:-mx-8">
        <span className="flex items-center gap-2 text-[0.8125rem] text-faint">
          <svg aria-hidden="true" width="14" height="18" viewBox="0 0 16 20" fill="currentColor">
            <circle cx="5" cy="4" r="1.6" />
            <circle cx="11" cy="4" r="1.6" />
            <circle cx="5" cy="10" r="1.6" />
            <circle cx="11" cy="10" r="1.6" />
            <circle cx="5" cy="16" r="1.6" />
            <circle cx="11" cy="16" r="1.6" />
          </svg>
          <span className="hidden md:inline">
            {t("dragHandle")} · {t("position", { row: Math.floor(index / 2) + 1, side: index % 2 ? "right" : "left" })}
          </span>
          <span className="md:hidden">{t("positionMobile", { index: index + 1, total })}</span>
        </span>
        <span className="flex gap-1.5">
          <button
            type="button"
            onClick={() => onMove(index - 1)}
            disabled={index === 0}
            aria-label={t("moveEarlier", { title })}
            className="h-11 w-11 border border-control text-[0.9375rem] disabled:opacity-30 md:h-9"
          >
            <span aria-hidden="true">←</span>
          </button>
          <button
            type="button"
            onClick={() => onMove(index + 1)}
            disabled={index === total - 1}
            aria-label={t("moveLater", { title })}
            className="h-11 w-11 border border-control text-[0.9375rem] disabled:opacity-30 md:h-9"
          >
            <span aria-hidden="true">→</span>
          </button>
          <button
            type="button"
            onClick={(event) => onEdit(event.currentTarget)}
            aria-label={t("editLabel", { title })}
            aria-pressed={selected}
            className="h-11 border border-accent bg-accent px-4 text-sm font-semibold text-paper md:h-9"
          >
            {t("edit")}
          </button>
        </span>
      </div>

      <div className="flex min-h-70 flex-1 items-center justify-center lg:min-h-90">
        {cover ? (
          <Image
            src={cover.src}
            alt={cover.alt || title}
            width={cover.width}
            height={cover.height}
            sizes="(min-width: 48rem) 42vw, 86vw"
            draggable={false}
            className="h-auto max-h-[22rem] w-auto max-w-full lg:max-h-[26rem]"
          />
        ) : (
          <p className="text-sm text-faint">{t("noImage")}</p>
        )}
      </div>

      <div className="flex flex-col gap-4 border-t border-line pt-5 lg:flex-row lg:items-start lg:gap-6 lg:pt-6">
        <div className="flex flex-1 items-start gap-4">
          <span
            aria-hidden="true"
            className="font-serif text-[2.25rem] leading-[0.9] text-accent italic lg:text-[2.75rem]"
          >
            {String(index + 1).padStart(2, "0")}
          </span>
          <div className="flex min-w-0 flex-col gap-1 lg:gap-1.5">
            <h2 className={`font-serif text-2xl font-medium lg:text-[1.75rem] ${work.title.trim() ? "" : "text-faint"}`}>
              {title}
            </h2>
            <p className="text-sm text-muted">
              {[size, work.status === "SOLD" ? tArtwork("soldOut") : tArtwork("available")]
                .filter(Boolean)
                .join(" · ")}
            </p>
            {!work.published && <p className="text-sm text-warn">{t("draft")}</p>}
            {needsAttention && <p className="text-sm font-semibold text-warn">{t("needsAttention")}</p>}
          </div>
        </div>

        <div className="flex items-center justify-between gap-3 lg:flex-col lg:items-end lg:gap-2.5">
          <span className={`font-semibold whitespace-nowrap ${price.warn ? "text-warn" : "text-ink"}`}>
            {price.label}
          </span>
          <span aria-hidden="true" className="button-primary pointer-events-none ml-auto whitespace-nowrap lg:ml-0">
            {t("viewPiece")}
          </span>
        </div>
      </div>
    </article>
  );
}
