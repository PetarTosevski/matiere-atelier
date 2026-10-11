"use client";

import { useTranslations } from "next-intl";
import { useEffect, useRef, useState, type MouseEvent } from "react";
import { ArtworkBody } from "@/components/ArtworkBody";
import { CartProvider } from "@/components/cart/CartProvider";
import { OriginalsGrid } from "@/components/OriginalsGrid";
import { compareArtworks } from "@/lib/order";
import { getPriceView } from "@/lib/pricing";
import type { Artwork } from "@/lib/types";

/** A piece as the preview shows it (saved data, or the form's unsaved values). */
export type PreviewArtwork = Artwork;

type Props = {
  open: boolean;
  onClose: () => void;
  /** Every piece to show on Originals; drafts are left out unless focused. */
  pieces: PreviewArtwork[];
  /** The piece being edited, outlined and opened first. Null on the artwork list. */
  focusId: string | null;
  showPrices: boolean;
};

type Tab = "originals" | "artwork";

/**
 * Shows the Originals grid and artwork pages as visitors will see them,
 * without leaving the admin. Uses the same components and price rules as the
 * storefront. Clicking a piece opens its page here instead of navigating.
 */
export function PreviewDialog({ open, onClose, pieces, focusId, showPrices }: Props) {
  const t = useTranslations("Admin.preview");
  const tOriginals = useTranslations("Originals");
  const tArtwork = useTranslations("Artwork");
  const dialogRef = useRef<HTMLDialogElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const [tab, setTab] = useState<Tab>("originals");
  const [selectedSlug, setSelectedSlug] = useState<string | null>(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (open && !dialog.open) {
      dialog.showModal();
      closeRef.current?.focus();
    }
    if (!open && dialog.open) dialog.close();
  }, [open]);

  const settings = { showPrices };
  const visible = pieces
    .filter((piece) => piece.published || piece.id === focusId)
    .map((piece) => ({ ...piece, title: piece.title.trim() || t("untitled") }))
    .sort(compareArtworks);
  const focused = visible.find((piece) => piece.id === focusId) ?? null;
  const selected =
    visible.find((piece) => piece.slug === selectedSlug) ?? focused ?? null;

  function show(nextTab: Tab) {
    setTab(nextTab);
    panelRef.current?.scrollTo({ top: 0 });
  }

  // Previews are for looking. A click on a piece opens its page here; other
  // links and the cart buttons do nothing.
  function onPanelClick(event: MouseEvent) {
    const target = event.target instanceof Element ? event.target : null;
    const link = target?.closest("a");
    if (link) {
      event.preventDefault();
      event.stopPropagation();
      const match = /\/originals\/([^/?#]+)$/.exec(link.getAttribute("href") ?? "");
      const slug = match?.[1] ? decodeURIComponent(match[1]) : null;
      if (slug && visible.some((piece) => piece.slug === slug)) {
        setSelectedSlug(slug);
        show("artwork");
      }
      return;
    }
    if (target?.closest("[data-cart-action]")) {
      event.preventDefault();
      event.stopPropagation();
    }
  }

  return (
    <dialog
      ref={dialogRef}
      aria-label={t("label")}
      onClose={() => {
        setTab("originals");
        setSelectedSlug(null);
        onClose();
      }}
      className="m-0 h-dvh max-h-none w-dvw max-w-none overflow-hidden bg-paper p-0 text-ink"
    >
      <div className="flex h-full flex-col">
        <div className="border-b border-line bg-band">
          <div className="site-container flex flex-wrap items-center justify-between gap-4 py-3">
            <p className="text-lg">{t("title")}</p>
            <div role="tablist" aria-label={t("tabs")} className="flex gap-2">
              {(["originals", "artwork"] as const).map((key) => (
                <button
                  key={key}
                  type="button"
                  role="tab"
                  id={`preview-tab-${key}`}
                  aria-selected={tab === key}
                  aria-controls="preview-panel"
                  onClick={() => show(key)}
                  className="button-quiet min-h-10 px-3 py-1 aria-selected:bg-ink aria-selected:text-paper"
                >
                  {key === "originals" ? t("originalsTab") : t("artworkTab")}
                </button>
              ))}
            </div>
            <button
              ref={closeRef}
              type="button"
              onClick={() => dialogRef.current?.close()}
              className="button-quiet min-h-10 px-3 py-1"
            >
              {t("close")}
            </button>
          </div>
          <div className="site-container space-y-1 pb-3 text-sm">
            <p>{focusId ? t("unsaved") : t("current")}</p>
            {focused && !focused.published && <p>{t("draft")}</p>}
            {!showPrices && <p>{t("showcase")}</p>}
          </div>
        </div>

        <div
          ref={panelRef}
          id="preview-panel"
          role="tabpanel"
          aria-labelledby={`preview-tab-${tab}`}
          onClickCapture={onPanelClick}
          className="flex-1 overflow-y-auto pb-16"
        >
          <CartProvider enabled={false}>
            <div className="site-container pt-6 md:pt-10">
              {tab === "originals" ? (
                <>
                  <h1 className="text-2xl tracking-tight md:text-3xl">{tOriginals("title")}</h1>
                  <OriginalsGrid
                    highlightId={focusId ?? undefined}
                    items={visible.map((piece) => ({
                      id: piece.id,
                      slug: piece.slug,
                      title: piece.title,
                      cover: piece.images[0],
                      hover: piece.images[1],
                      dimensions: piece.dimensions,
                      view: getPriceView(piece, settings),
                    }))}
                  />
                </>
              ) : !selected ? (
                <p className="text-muted">{t("pickPiece")}</p>
              ) : selected.images.length === 0 ? (
                <p className="text-muted">{t("noImage")}</p>
              ) : (
                <>
                  <button type="button" onClick={() => show("originals")} className="link text-sm text-muted">
                    {tArtwork("backToOriginals")}
                  </button>
                  <ArtworkBody
                    key={selected.id}
                    id={selected.id}
                    slug={selected.slug}
                    title={selected.title}
                    description={selected.description}
                    images={selected.images}
                    dimensions={selected.dimensions}
                    view={getPriceView(selected, settings)}
                  />
                </>
              )}
            </div>
          </CartProvider>
        </div>
      </div>
    </dialog>
  );
}
