"use client";

import Image from "next/image";
import { useTranslations } from "next-intl";
import { useEffect, useId, useRef, useState } from "react";
import { gridPosition } from "@/components/grid";
import { MarkdownField } from "@/components/admin/MarkdownField";
import type { ArtworkFieldError, ArtworkFormErrors } from "@/lib/artwork-form";
import type { EditorImage, EditorWork } from "@/lib/collection-changes";
import { currencySymbol } from "@/lib/currency";
import { formatPrice } from "@/lib/format";
import { parseAmount } from "@/lib/money";
import { slugify } from "@/lib/slug";
import { ImagesField } from "./ImagesField";

type Props = {
  work: EditorWork;
  index: number;
  currency: string;
  showPrices: boolean;
  /** The saved price mode, so Auction stays selectable only where it already is. */
  savedPriceMode: string | null;
  errors: ArtworkFormErrors;
  onChange: (patch: Partial<EditorWork>) => void;
  onReplaceCover: (file: File) => void;
  onAddImages: (files: FileList) => void;
  onRemoveImage: (image: EditorImage) => void;
  onDelete: () => void;
  deleting: boolean;
  onClose: () => void;
};

const inputClass =
  "block w-full border border-control bg-paper px-3.5 py-3 text-[1.0625rem] text-ink aria-[invalid=true]:border-2 aria-[invalid=true]:border-warn";

/**
 * The side panel for one piece. Edits go straight into the editor's state,
 * so the card updates as the artist types; nothing is saved until Publish.
 */
export function EditPanel({
  work,
  index,
  currency,
  showPrices,
  savedPriceMode,
  errors,
  onChange,
  onReplaceCover,
  onAddImages,
  onRemoveImage,
  onDelete,
  deleting,
  onClose,
}: Props) {
  const t = useTranslations("Admin.collection.panel");
  const tCollection = useTranslations("Admin.collection");
  const tForm = useTranslations("Admin.form");
  const id = useId();
  const headingRef = useRef<HTMLHeadingElement>(null);
  // The parent remounts the panel per piece (key), which resets this.
  const [confirming, setConfirming] = useState(false);
  const title = work.title.trim() || tCollection("untitled");
  const cover = work.images[0];

  // Move focus into the panel when it opens.
  useEffect(() => {
    headingRef.current?.focus();
  }, []);

  const fieldError = (key: keyof ArtworkFormErrors) => {
    const error = errors[key];
    return error ? tForm(`errors.${error as ArtworkFieldError}`) : null;
  };
  const describe = (key: keyof ArtworkFormErrors, hint?: string) =>
    [hint, errors[key] ? `${id}-${key}-error` : null].filter(Boolean).join(" ") || undefined;

  const amount = work.amount.trim() ? parseAmount(work.amount) : null;
  const shownAs =
    work.priceMode === "PRICE" && showPrices && amount !== null ? formatPrice(amount, currency, "en") : null;
  const notShownReason = work.priceMode !== "PRICE" ? "display" : !showPrices ? "hidden" : "none";

  return (
    <aside
      aria-labelledby={`${id}-heading`}
      onKeyDown={(event) => {
        if (event.key === "Escape") onClose();
      }}
      className="fixed inset-y-0 right-0 z-50 flex w-full flex-col gap-5 overflow-y-auto border-l border-control bg-panel p-6 shadow-[-24px_0_48px_rgba(0,0,0,0.5)] sm:w-[27.5rem] sm:p-7"
    >
      <div className="flex items-center justify-between gap-3">
        <h2
          id={`${id}-heading`}
          ref={headingRef}
          tabIndex={-1}
          className="font-serif text-[2rem] font-normal focus:outline-none"
        >
          {t("title", { number: String(index + 1).padStart(2, "0") })}
        </h2>
        <button
          type="button"
          onClick={onClose}
          aria-label={t("close")}
          className="size-11 shrink-0 border border-control text-xl"
        >
          <span aria-hidden="true">×</span>
        </button>
      </div>
      <p className="-mt-3 text-[0.8125rem] text-faint">
        <span className="xl:hidden">{tCollection("position", gridPosition(index, 2))}</span>
        <span className="hidden xl:inline">{tCollection("position", gridPosition(index, 3))}</span>
      </p>

      <div className="flex min-h-55 items-center justify-center bg-paper p-5">
        {cover ? (
          <Image
            src={cover.src}
            alt=""
            width={cover.width}
            height={cover.height}
            sizes="24rem"
            className="h-auto max-h-60 w-auto max-w-full"
          />
        ) : (
          <p className="text-sm text-faint">{tCollection("noImage")}</p>
        )}
      </div>
      <label className="inline-flex min-h-11 cursor-pointer items-center self-start border border-control px-4.5 text-sm font-semibold focus-within:outline-2 focus-within:outline-ink">
        {t("replaceImage")}
        <input
          type="file"
          accept="image/jpeg,image/png,image/webp"
          onChange={(event) => {
            const file = event.target.files?.[0];
            if (file) onReplaceCover(file);
            event.target.value = "";
          }}
          className="sr-only"
        />
      </label>

      <div>
        <label htmlFor={`${id}-title`} className="mb-2 block text-sm text-muted">{t("name")}</label>
        <input
          id={`${id}-title`}
          value={work.title}
          placeholder={t("namePlaceholder")}
          onChange={(event) => onChange({ title: event.target.value })}
          aria-invalid={errors.title ? true : undefined}
          aria-describedby={describe("title")}
          className={inputClass}
        />
        {fieldError("title") && <p id={`${id}-title-error`} className="mt-2 text-sm text-warn">{fieldError("title")}</p>}
      </div>

      <div>
        <label htmlFor={`${id}-amount`} className="mb-2 block text-sm text-muted">{t("price")}</label>
        <div className="flex items-stretch border border-control bg-paper focus-within:outline-2 focus-within:outline-ink">
          <span aria-hidden="true" className="flex items-center border-r border-control px-3.5 text-accent">
            {currencySymbol(currency, "en")}
          </span>
          <input
            id={`${id}-amount`}
            inputMode="decimal"
            value={work.amount}
            placeholder="0.00"
            onChange={(event) => onChange({ amount: event.target.value })}
            aria-invalid={errors.amount ? true : undefined}
            aria-describedby={describe("amount", `${id}-amount-shown`)}
            className="min-w-0 flex-1 bg-transparent px-3.5 py-3 text-[1.0625rem] text-ink focus:outline-none"
          />
        </div>
        <p id={`${id}-amount-shown`} className="mt-2 text-[0.8125rem] text-faint">
          {shownAs
            ? t.rich("shownAs", {
                price: shownAs,
                strong: (chunks) => <strong className="text-ink">{chunks}</strong>,
              })
            : t("shownNone", { reason: notShownReason })}
        </p>
        {fieldError("amount") && <p id={`${id}-amount-error`} className="mt-2 text-sm text-warn">{fieldError("amount")}</p>}
      </div>

      <MarkdownField
        id={`${id}-description`}
        name="description"
        label={t("description")}
        hint={t("descriptionHint")}
        value={work.description}
        onChange={(description) => onChange({ description })}
        error={fieldError("description")}
        rows={6}
        stacked
      />

      <fieldset className="space-y-5 border-t border-line pt-5">
        <legend className="float-left mb-1 font-serif text-2xl">{t("details")}</legend>

        <div className="clear-left grid grid-cols-2 gap-3">
          {(["width", "height"] as const).map((key) => (
            <div key={key}>
              <label htmlFor={`${id}-${key}`} className="mb-1 block text-sm text-muted">{tForm(key)}</label>
              <input
                id={`${id}-${key}`}
                inputMode="decimal"
                value={work[key]}
                onChange={(event) => onChange({ [key]: event.target.value })}
                aria-invalid={errors.dimensions ? true : undefined}
                aria-describedby={describe("dimensions", `${id}-dimensions-hint`)}
                className={inputClass}
              />
            </div>
          ))}
          <p id={`${id}-dimensions-hint`} className="col-span-2 text-xs text-faint">{tForm("dimensionsHint")}</p>
          {fieldError("dimensions") && (
            <p id={`${id}-dimensions-error`} className="col-span-2 text-sm text-warn">{fieldError("dimensions")}</p>
          )}
        </div>

        <div>
          <label htmlFor={`${id}-mode`} className="mb-1 block text-sm text-muted">{tForm("priceMode")}</label>
          <select
            id={`${id}-mode`}
            value={work.priceMode}
            onChange={(event) => onChange({ priceMode: event.target.value })}
            aria-invalid={errors.priceMode ? true : undefined}
            aria-describedby={describe("priceMode")}
            className={inputClass}
          >
            <option value="PRICE">{tForm("modes.PRICE")}</option>
            <option value="AUCTION" disabled={savedPriceMode !== "AUCTION"}>{tForm("modes.AUCTION")}</option>
            <option value="DISPLAY">{tForm("modes.DISPLAY")}</option>
          </select>
          {fieldError("priceMode") && <p id={`${id}-priceMode-error`} className="mt-2 text-sm text-warn">{fieldError("priceMode")}</p>}
        </div>

        <fieldset>
          <legend className="text-sm text-muted">{tForm("status")}</legend>
          <div className="mt-2 flex gap-6">
            {(["AVAILABLE", "SOLD"] as const).map((status) => (
              <label key={status} className="flex min-h-11 items-center gap-2">
                <input
                  type="radio"
                  name={`${id}-status`}
                  checked={work.status === status}
                  onChange={() => onChange({ status })}
                  className="size-4 accent-accent"
                />
                {status === "SOLD" ? tForm("statusSold") : tForm("statusAvailable")}
              </label>
            ))}
          </div>
        </fieldset>

        <div>
          <label className="flex min-h-11 items-center gap-3">
            <input
              type="checkbox"
              role="switch"
              checked={work.published}
              onChange={(event) => onChange({ published: event.target.checked })}
              aria-describedby={`${id}-published-hint`}
              className="size-5 accent-accent"
            />
            {tForm("published")}
          </label>
          <p id={`${id}-published-hint`} className="text-xs text-faint">{tForm("publishedHint")}</p>
        </div>

        <div>
          <label htmlFor={`${id}-slug`} className="mb-1 block text-sm text-muted">{tForm("slug")}</label>
          <input
            id={`${id}-slug`}
            value={work.slug}
            placeholder={slugify(work.title)}
            onChange={(event) => onChange({ slug: event.target.value })}
            aria-invalid={errors.slug ? true : undefined}
            aria-describedby={describe("slug", `${id}-slug-hint`)}
            className={inputClass}
          />
          <p id={`${id}-slug-hint`} className="mt-1 text-xs text-faint">{tForm("slugHint")}</p>
          {fieldError("slug") && <p id={`${id}-slug-error`} className="mt-2 text-sm text-warn">{fieldError("slug")}</p>}
        </div>

        <ImagesField
          images={work.images}
          title={title}
          onChange={(images) => onChange({ images })}
          onRemove={onRemoveImage}
          onAdd={onAddImages}
          error={fieldError("images")}
        />
      </fieldset>

      <p className="text-[0.8125rem] leading-normal text-faint">{t("note")}</p>
      <button
        type="button"
        onClick={onClose}
        className="min-h-12 bg-accent text-[0.9375rem] font-semibold text-paper"
      >
        {t("done")}
      </button>

      <div className="border-t border-line pt-5">
        {confirming ? (
          <div role="alert" className="space-y-3">
            <p className="text-sm">
              {work.id ? t("confirmDelete", { title }) : t("confirmDeleteNew", { title })}
            </p>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={onDelete}
                disabled={deleting}
                className="min-h-11 border border-warn px-4 text-sm font-semibold text-warn"
              >
                {t("confirmYes")}
              </button>
              <button
                type="button"
                onClick={() => setConfirming(false)}
                className="min-h-11 border border-control px-4 text-sm"
              >
                {t("cancel")}
              </button>
            </div>
          </div>
        ) : (
          <button type="button" onClick={() => setConfirming(true)} className="link min-h-11 text-sm text-muted">
            {t("delete")}
          </button>
        )}
      </div>
    </aside>
  );
}
