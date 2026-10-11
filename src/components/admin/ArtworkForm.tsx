"use client";

import Image from "next/image";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { useActionState, useEffect, useId, useRef, useState, type DragEvent } from "react";
import {
  discardUploadsAction,
  saveArtworkAction,
  type SaveArtworkState,
} from "@/app/admin/actions";
import type { PreviewContext } from "@/app/admin/preview-context";
import { PreviewDialog } from "@/components/admin/PreviewDialog";
import { MarkdownField } from "@/components/admin/MarkdownField";
import { parseCentimetres, type ArtworkFieldError } from "@/lib/artwork-form";
import type { AdminArtwork } from "@/lib/artworks";
import { amountToInput, parseAmount } from "@/lib/money";
import { slugify } from "@/lib/slug";
import type { PriceMode } from "@/lib/types";

type FormImage = {
  storageId: string;
  src: string;
  width: number;
  height: number;
  alt: string;
  /** Uploaded in this session and not saved yet. */
  isNew: boolean;
};

type UploadProblem = "tooLarge" | "heic" | "unsupported" | "unreadable" | "unauthorized" | "failed";

const MAX_BYTES = 20 * 1024 * 1024;
const initialState: SaveArtworkState = { status: "idle" };

const inputClass =
  "mt-2 block w-full border border-ink/40 bg-field px-3 py-2.5 aria-[invalid=true]:border-2 aria-[invalid=true]:border-ink";

export function ArtworkForm({
  artwork,
  preview,
}: {
  artwork: AdminArtwork | null;
  preview: PreviewContext;
}) {
  const t = useTranslations("Admin.form");
  const id = useId();
  const [state, formAction, pending] = useActionState(saveArtworkAction, initialState);
  const summaryRef = useRef<HTMLDivElement>(null);

  const [title, setTitle] = useState(artwork?.title ?? "");
  const [slug, setSlug] = useState(artwork?.slug ?? "");
  const [slugEdited, setSlugEdited] = useState(Boolean(artwork));
  const [description, setDescription] = useState(artwork?.description ?? "");
  const [priceMode, setPriceMode] = useState<PriceMode>(artwork?.priceMode ?? "PRICE");
  const [amount, setAmount] = useState(amountToInput(artwork?.priceAmount ?? null));
  // Controlled so a failed save (React resets uncontrolled fields) keeps them.
  const [status, setStatus] = useState(artwork?.status ?? "AVAILABLE");
  const [published, setPublished] = useState(artwork?.published ?? false);
  const [width, setWidth] = useState(artwork?.dimensions ? String(artwork.dimensions.width) : "");
  const [height, setHeight] = useState(artwork?.dimensions ? String(artwork.dimensions.height) : "");
  const [images, setImages] = useState<FormImage[]>(
    (artwork?.images ?? []).map((image) => ({ ...image, isNew: false })),
  );
  const [uploading, setUploading] = useState<string | null>(null);
  const [uploadErrors, setUploadErrors] = useState<{ name: string; error: UploadProblem }[]>([]);
  const dragIndex = useRef<number | null>(null);
  const [previewOpen, setPreviewOpen] = useState(false);

  useEffect(() => {
    if (state.status === "error") summaryRef.current?.focus();
  }, [state]);

  const errors = state.errors ?? {};
  const fieldError = (key: keyof typeof errors) => {
    const error = errors[key];
    return error ? t(`errors.${error as ArtworkFieldError}`) : null;
  };
  const shownSlug = slugEdited ? slug : slugify(title);

  async function upload(files: FileList | null) {
    if (!files) return;
    setUploadErrors([]);
    for (const file of Array.from(files)) {
      if (file.size > MAX_BYTES) {
        setUploadErrors((current) => [...current, { name: file.name, error: "tooLarge" }]);
        continue;
      }
      setUploading(file.name);
      try {
        const body = new FormData();
        body.append("file", file);
        const response = await fetch("/admin/upload", { method: "POST", body });
        const result = (await response.json()) as
          | { storageId: string; src: string; width: number; height: number }
          | { error: UploadProblem };
        if ("error" in result) {
          setUploadErrors((current) => [...current, { name: file.name, error: result.error }]);
        } else {
          setImages((current) => [...current, { ...result, alt: "", isNew: true }]);
        }
      } catch {
        setUploadErrors((current) => [...current, { name: file.name, error: "failed" }]);
      }
    }
    setUploading(null);
  }

  function move(from: number, to: number) {
    if (to < 0 || to >= images.length || from === to) return;
    setImages((current) => {
      const next = [...current];
      const [moved] = next.splice(from, 1);
      next.splice(to, 0, moved!);
      return next;
    });
  }

  function remove(index: number) {
    const image = images[index];
    if (!image) return;
    setImages((current) => current.filter((_, i) => i !== index));
    // Saved images are deleted when the artwork is saved without them.
    if (image.isNew) void discardUploadsAction([image.storageId]);
  }

  function onDrop(event: DragEvent, to: number) {
    event.preventDefault();
    if (dragIndex.current !== null) move(dragIndex.current, to);
    dragIndex.current = null;
  }

  const parsedAmount = parseAmount(amount);
  const previewArtwork = {
    id: artwork?.id ?? "preview-new",
    slug: shownSlug,
    title,
    description,
    priceMode,
    // Same rule as saving: an unparseable or empty amount keeps the stored one.
    priceAmount: parsedAmount ?? artwork?.priceAmount ?? null,
    currency: artwork?.currency ?? "EUR",
    status,
    published,
    sortOrder: artwork?.sortOrder ?? preview.newSortOrder,
    dimensions: (() => {
      const w = parseCentimetres(width);
      const h = parseCentimetres(height);
      return w !== null && h !== null ? { width: w, height: h } : null;
    })(),
    // Unsaved new pieces count as the newest.
    createdAt: artwork?.createdAt ?? "9999-12-31T00:00:00.000Z",
    images: images.map(({ src, width, height, alt }) => ({ src, width, height, alt: alt || title })),
  };

  const imagesJson = JSON.stringify(
    images.map(({ storageId, width, height, alt }) => ({ storageId, width, height, alt })),
  );

  return (
    <form action={formAction} noValidate className="mt-8 space-y-10">
      <PreviewDialog
        open={previewOpen}
        onClose={() => setPreviewOpen(false)}
        pieces={[...preview.pieces, previewArtwork]}
        focusId={previewArtwork.id}
        showPrices={preview.showPrices}
      />
      <input type="hidden" name="id" value={artwork?.id ?? ""} />
      <input type="hidden" name="images" value={imagesJson} />

      <div ref={summaryRef} tabIndex={-1} role="alert" className="focus:outline-none">
        {state.status === "error" && (
          <p className="border-l-2 border-ink pl-3">
            {state.failed ? t("saveFailed") : t("formError")}
          </p>
        )}
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <div>
          <label htmlFor={`${id}-title`} className="block">{t("title")}</label>
          <input
            id={`${id}-title`}
            name="title"
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            required
            aria-invalid={errors.title ? true : undefined}
            aria-describedby={errors.title ? `${id}-title-error` : undefined}
            className={inputClass}
          />
          {fieldError("title") && <p id={`${id}-title-error`} className="mt-2 text-sm">{fieldError("title")}</p>}
        </div>
        <div>
          <label htmlFor={`${id}-slug`} className="block">{t("slug")}</label>
          <input
            id={`${id}-slug`}
            name="slug"
            value={shownSlug}
            onChange={(event) => {
              setSlugEdited(true);
              setSlug(event.target.value);
            }}
            aria-invalid={errors.slug ? true : undefined}
            aria-describedby={`${id}-slug-hint${errors.slug ? ` ${id}-slug-error` : ""}`}
            className={inputClass}
          />
          <p id={`${id}-slug-hint`} className="mt-1 text-sm text-muted">{t("slugHint")}</p>
          {fieldError("slug") && <p id={`${id}-slug-error`} className="mt-2 text-sm">{fieldError("slug")}</p>}
        </div>
      </div>

      <fieldset>
        <legend className="text-lg">{t("images")}</legend>
        <p id={`${id}-images-hint`} className="mt-1 text-sm text-muted">{t("imagesHint")}</p>
        {fieldError("images") && <p className="mt-2 text-sm">{fieldError("images")}</p>}

        {images.length > 0 && (
          <ol className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {images.map((image, index) => (
              <li
                key={image.storageId}
                draggable
                onDragStart={() => (dragIndex.current = index)}
                onDragOver={(event) => event.preventDefault()}
                onDrop={(event) => onDrop(event, index)}
                aria-label={t("imageLabel", { index: index + 1, total: images.length })}
                className="border border-line bg-field p-3"
              >
                <div className="relative aspect-[4/5]">
                  <Image
                    src={image.src}
                    alt={image.alt || title}
                    fill
                    sizes="(min-width: 64rem) 20rem, 45vw"
                    className="object-contain"
                  />
                </div>
                {index === 0 && <p className="mt-2 text-sm">{t("cover")}</p>}
                <label htmlFor={`${id}-alt-${index}`} className="mt-3 block text-sm">{t("alt")}</label>
                <input
                  id={`${id}-alt-${index}`}
                  value={image.alt}
                  placeholder={title}
                  onChange={(event) => {
                    const alt = event.target.value;
                    setImages((current) => current.map((item, i) => (i === index ? { ...item, alt } : item)));
                  }}
                  aria-describedby={`${id}-alt-hint`}
                  className={inputClass}
                />
                <div className="mt-3 flex flex-wrap gap-2 text-sm">
                  {index > 0 && (
                    <button type="button" onClick={() => move(index, 0)} className="button-quiet min-h-9 px-2 py-1">
                      {t("makeCover")}
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => move(index, index - 1)}
                    disabled={index === 0}
                    aria-label={t("moveEarlierLabel", { index: index + 1 })}
                    className="button-quiet min-h-9 px-2 py-1"
                  >
                    {t("moveEarlier")}
                  </button>
                  <button
                    type="button"
                    onClick={() => move(index, index + 1)}
                    disabled={index === images.length - 1}
                    aria-label={t("moveLaterLabel", { index: index + 1 })}
                    className="button-quiet min-h-9 px-2 py-1"
                  >
                    {t("moveLater")}
                  </button>
                  <button
                    type="button"
                    onClick={() => remove(index)}
                    aria-label={t("removeLabel", { index: index + 1 })}
                    className="link min-h-9"
                  >
                    {t("remove")}
                  </button>
                </div>
              </li>
            ))}
          </ol>
        )}
        <p id={`${id}-alt-hint`} className="sr-only">{t("altHint")}</p>

        <div className="mt-4">
          <label htmlFor={`${id}-upload`} className="button-quiet cursor-pointer">
            {t("addImages")}
          </label>
          <input
            id={`${id}-upload`}
            type="file"
            multiple
            accept="image/jpeg,image/png,image/webp"
            aria-describedby={`${id}-images-hint`}
            onChange={(event) => {
              void upload(event.target.files);
              event.target.value = "";
            }}
            className="sr-only"
          />
          <div role="status" className="mt-3 space-y-1 text-sm">
            {uploading && <p>{t("uploading", { name: uploading })}</p>}
            {uploadErrors.map((problem) => (
              <p key={problem.name}>{t("uploadErrors", { error: problem.error, name: problem.name })}</p>
            ))}
          </div>
        </div>
      </fieldset>

      <MarkdownField
        id={`${id}-description`}
        name="description"
        label={t("description")}
        hint={t("descriptionHint")}
        value={description}
        onChange={setDescription}
        placeholder={"**Medium:** acrylic and texture paste on linen canvas\n**Frame:** optional float frame in light or dark wood"}
        error={fieldError("description")}
      />

      <fieldset>
        <legend className="text-lg">{t("dimensions")}</legend>
        <p id={`${id}-dimensions-hint`} className="mt-1 text-sm text-muted">{t("dimensionsHint")}</p>
        <div className="mt-2 grid max-w-md grid-cols-2 gap-4">
          {(
            [
              ["width", width, setWidth],
              ["height", height, setHeight],
            ] as const
          ).map(([key, value, setValue]) => (
            <div key={key}>
              <label htmlFor={`${id}-${key}`} className="block">{t(key)}</label>
              <input
                id={`${id}-${key}`}
                name={key}
                inputMode="decimal"
                value={value}
                onChange={(event) => setValue(event.target.value)}
                aria-invalid={errors.dimensions ? true : undefined}
                aria-describedby={`${id}-dimensions-hint${errors.dimensions ? ` ${id}-dimensions-error` : ""}`}
                className={inputClass}
              />
            </div>
          ))}
        </div>
        {fieldError("dimensions") && (
          <p id={`${id}-dimensions-error`} className="mt-2 text-sm">{fieldError("dimensions")}</p>
        )}
      </fieldset>

      <fieldset className="grid gap-6 md:grid-cols-2">
        <legend className="text-lg">{t("pricing")}</legend>
        <div>
          <label htmlFor={`${id}-mode`} className="block">{t("priceMode")}</label>
          <select
            id={`${id}-mode`}
            name="priceMode"
            value={priceMode}
            onChange={(event) => setPriceMode(event.target.value as PriceMode)}
            aria-invalid={errors.priceMode ? true : undefined}
            className={inputClass}
          >
            <option value="PRICE">{t("modes.PRICE")}</option>
            <option value="AUCTION" disabled={artwork?.priceMode !== "AUCTION"}>{t("modes.AUCTION")}</option>
            <option value="DISPLAY">{t("modes.DISPLAY")}</option>
          </select>
          {fieldError("priceMode") && <p className="mt-2 text-sm">{fieldError("priceMode")}</p>}
        </div>
        <div>
          <label htmlFor={`${id}-amount`} className="block">{t("amount")}</label>
          <div className="mt-2 flex items-center gap-2">
            <input
              id={`${id}-amount`}
              name="amount"
              inputMode="decimal"
              value={amount}
              onChange={(event) => setAmount(event.target.value)}
              required={priceMode === "PRICE"}
              aria-invalid={errors.amount ? true : undefined}
              aria-describedby={`${id}-amount-hint${errors.amount ? ` ${id}-amount-error` : ""}`}
              className={`${inputClass} mt-0`}
            />
            <span aria-hidden="true">{t("currency")}</span>
          </div>
          <p id={`${id}-amount-hint`} className="mt-1 text-sm text-muted">
            {priceMode === "PRICE" ? t("amountHint") : t("amountKeptHint")}
          </p>
          {fieldError("amount") && <p id={`${id}-amount-error`} className="mt-2 text-sm">{fieldError("amount")}</p>}
        </div>
      </fieldset>

      <div className="grid gap-6 md:grid-cols-2">
        <fieldset>
          <legend>{t("status")}</legend>
          <div className="mt-2 flex gap-6">
            <label className="flex items-center gap-2">
              <input type="radio" name="status" value="AVAILABLE" checked={status === "AVAILABLE"} onChange={() => setStatus("AVAILABLE")} className="accent-ink" />
              {t("statusAvailable")}
            </label>
            <label className="flex items-center gap-2">
              <input type="radio" name="status" value="SOLD" checked={status === "SOLD"} onChange={() => setStatus("SOLD")} className="accent-ink" />
              {t("statusSold")}
            </label>
          </div>
        </fieldset>
        <div>
          <label className="flex items-center gap-3">
            <input
              type="checkbox"
              role="switch"
              name="published"
              checked={published}
              onChange={(event) => setPublished(event.target.checked)}
              aria-describedby={`${id}-published-hint`}
              className="size-5 accent-ink"
            />
            {t("published")}
          </label>
          <p id={`${id}-published-hint`} className="mt-1 text-sm text-muted">{t("publishedHint")}</p>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-6 border-t border-line pt-6">
        <button type="submit" disabled={pending || uploading !== null} className="button-primary">
          {pending ? t("saving") : t("save")}
        </button>
        <button type="button" onClick={() => setPreviewOpen(true)} className="button-quiet">
          {t("previewButton")}
        </button>
        <Link href="/admin" className="link">{t("cancel")}</Link>
      </div>
    </form>
  );
}
