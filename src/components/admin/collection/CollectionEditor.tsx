"use client";

import { useTranslations } from "next-intl";
import { useEffect, useMemo, useRef, useState, useTransition, type DragEvent } from "react";
import {
  deleteArtworkAction,
  discardUploadsAction,
  exchangeRateAction,
  publishChangesAction,
} from "@/app/admin/actions";
import { GRID_CLASS } from "@/components/grid";
import { routing } from "@/i18n/routing";
import { OriginalsIntro } from "@/components/OriginalsIntro";
import type { ArtworkFormErrors } from "@/lib/artwork-form";
import { toChanges, type EditorImage, type EditorWork } from "@/lib/collection-changes";
import { SHOP_CURRENCIES } from "@/lib/currency";
import { formatPrice } from "@/lib/format";
import { amountToInput, convertAmount, parseAmount, RATE_SCALE } from "@/lib/money";
import { SITE_NAME } from "@/lib/site";
import type { SiteSettings, Theme } from "@/lib/types";
import { EditPanel } from "./EditPanel";
import { titleFromFileName, uploadImage, type UploadProblem } from "./upload";
import { WorkCard } from "./WorkCard";

type Props = {
  initialWorks: EditorWork[];
  initialSettings: SiteSettings;
  /** The piece whose edit panel opens first (from the storefront's Edit link). */
  initialSelectedKey?: string | null;
};

/** The last price conversion, kept so it can be undone before publishing. */
type Conversion = {
  from: string;
  to: string;
  rate: number;
  date: string;
  /** Amounts as they were before, by piece key. */
  previous: Map<string, string>;
};

type Notice =
  | { kind: "published" }
  | { kind: "publishErrors"; count: number }
  | { kind: "publishFailed" }
  | { kind: "deleted"; title: string }
  | { kind: "deleteFailed"; title: string };

/** The web address of each piece that is on the site now, by key. */
const liveSlugs = (works: EditorWork[]) =>
  new Map(works.filter((work) => work.published).map((work) => [work.key, work.slug]));

const snapshot = (settings: SiteSettings, works: EditorWork[]) => JSON.stringify(toChanges(settings, works));

/**
 * The admin collection page: the Originals page as visitors see it, with
 * reordering, editing and uploading on top. Everything stays in this
 * component until "Publish changes" sends it to the server in one go.
 */
export function CollectionEditor({ initialWorks, initialSettings, initialSelectedKey = null }: Props) {
  const t = useTranslations("Admin.collection");
  const tForm = useTranslations("Admin.form");
  const tNav = useTranslations("Nav");
  const tFooter = useTranslations("Footer");
  const tCart = useTranslations("CartLink");

  const [works, setWorks] = useState(initialWorks);
  const [currency, setCurrency] = useState(initialSettings.currency);
  const [showPrices, setShowPrices] = useState(initialSettings.showPrices);
  const [theme, setTheme] = useState<Theme>(initialSettings.theme);
  // The currency the typed amounts are in. It differs from `currency` after
  // a switch until the prices are converted (or published as they are).
  const [amountsCurrency, setAmountsCurrency] = useState(initialSettings.currency);
  const [conversion, setConversion] = useState<Conversion | null>(null);
  const [converting, setConverting] = useState(false);
  const [rateFailed, setRateFailed] = useState(false);
  const [saved, setSaved] = useState({
    ...initialSettings,
    snapshot: snapshot(initialSettings, initialWorks),
    modes: new Map(initialWorks.map((work) => [work.key, work.priceMode])),
    live: liveSlugs(initialWorks),
  });
  const [selectedKey, setSelectedKey] = useState<string | null>(initialSelectedKey);
  const [errors, setErrors] = useState<Record<string, ArtworkFormErrors>>({});
  const [notice, setNotice] = useState<Notice | null>(null);
  const [uploading, setUploading] = useState<string | null>(null);
  const [uploadErrors, setUploadErrors] = useState<{ name: string; error: UploadProblem }[]>([]);
  const [dragKey, setDragKey] = useState<string | null>(null);
  const [overKey, setOverKey] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [publishing, startPublish] = useTransition();
  const editButton = useRef<HTMLButtonElement | null>(null);

  const dirty = useMemo(
    () => snapshot({ currency, showPrices, theme }, works) !== saved.snapshot,
    [currency, showPrices, theme, works, saved.snapshot],
  );

  // The page previews the site in the theme being set.
  useEffect(() => {
    document.documentElement.dataset.theme = theme;
  }, [theme]);

  // Warn before leaving with unpublished changes.
  useEffect(() => {
    if (!dirty) return;
    const warn = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = t("leaveWarning");
    };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty, t]);

  const selectedIndex = works.findIndex((work) => work.key === selectedKey);
  const selected = selectedIndex === -1 ? null : works[selectedIndex]!;

  function update(key: string, patch: Partial<EditorWork>) {
    setWorks((current) => current.map((work) => (work.key === key ? { ...work, ...patch } : work)));
  }

  function move(from: number, to: number) {
    if (to < 0 || to >= works.length || from === to) return;
    setWorks((current) => {
      const next = [...current];
      const [moved] = next.splice(from, 1);
      next.splice(to, 0, moved!);
      return next;
    });
  }

  function closePanel() {
    setSelectedKey(null);
    editButton.current?.focus();
  }

  async function uploadAll(files: File[]): Promise<EditorImage[]> {
    setUploadErrors([]);
    const images: EditorImage[] = [];
    for (const file of files) {
      setUploading(file.name);
      const result = await uploadImage(file);
      if (result.ok) images.push(result.image);
      else setUploadErrors((current) => [...current, { name: file.name, error: result.error }]);
    }
    setUploading(null);
    return images;
  }

  /** New pieces from files: one draft per image, added at the end. */
  async function addWorks(list: FileList | File[]) {
    const files = Array.from(list).filter((file) => file.type.startsWith("image/") || !file.type);
    if (files.length === 0) return;
    const added: EditorWork[] = [];
    for (const file of files) {
      const [image] = await uploadAll([file]);
      if (!image) continue;
      added.push({
        key: `new-${crypto.randomUUID()}`,
        id: null,
        title: titleFromFileName(file.name),
        slug: "",
        description: "",
        priceMode: "PRICE",
        amount: "",
        status: "AVAILABLE",
        published: false,
        width: "",
        height: "",
        images: [image],
      });
    }
    if (added.length === 0) return;
    setWorks((current) => [...current, ...added]);
    setSelectedKey(added[0]!.key);
  }

  function discard(images: EditorImage[]) {
    const ids = images.filter((image) => image.isNew).map((image) => image.storageId);
    if (ids.length > 0) void discardUploadsAction(ids);
  }

  async function replaceCover(work: EditorWork, file: File) {
    const [image] = await uploadAll([file]);
    if (!image) return;
    const old = work.images[0];
    update(work.key, { images: [image, ...work.images.slice(1)] });
    if (old) discard([old]);
  }

  async function addImages(work: EditorWork, files: FileList) {
    const images = await uploadAll(Array.from(files));
    if (images.length === 0) return;
    setWorks((current) =>
      current.map((item) => (item.key === work.key ? { ...item, images: [...item.images, ...images] } : item)),
    );
  }

  async function deleteWork(work: EditorWork) {
    const title = work.title.trim() || t("untitled");
    setDeleting(true);
    if (work.id) {
      const result = await deleteArtworkAction(work.id);
      if (!result.ok) {
        setDeleting(false);
        setNotice({ kind: "deleteFailed", title });
        return;
      }
      // Already gone from the site, so drop it from the saved state too.
      setSaved((current) => {
        const changes = JSON.parse(current.snapshot) as ReturnType<typeof toChanges>;
        const savedWorks = changes.works.filter((item) => item.key !== work.key);
        return { ...current, snapshot: JSON.stringify({ ...changes, works: savedWorks }) };
      });
    } else {
      discard(work.images);
    }
    setWorks((current) => current.filter((item) => item.key !== work.key));
    setDeleting(false);
    setSelectedKey(null);
    setNotice({ kind: "deleted", title });
  }

  function publish() {
    setNotice(null);
    startPublish(async () => {
      const result = await publishChangesAction(toChanges({ currency, showPrices, theme }, works));
      if (result.status === "published") {
        setWorks(result.works);
        setCurrency(result.settings.currency);
        setAmountsCurrency(result.settings.currency);
        setConversion(null);
        setShowPrices(result.settings.showPrices);
        setTheme(result.settings.theme);
        setSaved({
          ...result.settings,
          snapshot: snapshot(result.settings, result.works),
          modes: new Map(result.works.map((work) => [work.key, work.priceMode])),
          live: liveSlugs(result.works),
        });
        setErrors({});
        // New pieces get their database id as key, so close a panel left open on one.
        setSelectedKey((key) => (key && result.works.some((work) => work.key === key) ? key : null));
        setNotice({ kind: "published" });
      } else if (result.errors && Object.keys(result.errors).length > 0) {
        setErrors(result.errors);
        setNotice({ kind: "publishErrors", count: Object.keys(result.errors).length });
        const first = works.find((work) => result.errors![work.key]);
        if (first) setSelectedKey(first.key);
      } else {
        setNotice({ kind: "publishFailed" });
      }
    });
  }

  // ---- Drag and drop: reorder pieces, or drop image files to add works ----

  function onCardDragStart(event: DragEvent, key: string) {
    event.dataTransfer.effectAllowed = "move";
    event.dataTransfer.setData("text/plain", key);
    setDragKey(key);
  }

  function onCardDrop(event: DragEvent, to: number) {
    event.preventDefault();
    if (!dragKey && event.dataTransfer.files.length > 0) {
      void addWorks(event.dataTransfer.files);
    } else if (dragKey) {
      move(works.findIndex((work) => work.key === dragKey), to);
    }
    setDragKey(null);
    setOverKey(null);
  }

  async function convertPrices() {
    const from = amountsCurrency;
    const to = currency;
    setConverting(true);
    setRateFailed(false);
    const result = await exchangeRateAction(from, to);
    setConverting(false);
    if (!result) {
      setRateFailed(true);
      return;
    }
    const previous = new Map(works.map((work) => [work.key, work.amount]));
    setWorks((current) =>
      current.map((work) => {
        const amount = parseAmount(work.amount);
        // Empty or mistyped amounts are left for the artist to fix.
        return amount === null ? work : { ...work, amount: amountToInput(convertAmount(amount, result.rate)) };
      }),
    );
    setAmountsCurrency(to);
    setConversion({ from, to, rate: result.rate, date: result.date, previous });
  }

  function undoConversion() {
    if (!conversion) return;
    setWorks((current) =>
      current.map((work) =>
        conversion.previous.has(work.key) ? { ...work, amount: conversion.previous.get(work.key)! } : work,
      ),
    );
    setAmountsCurrency(conversion.from);
    setConversion(null);
  }

  const unconverted = currency !== amountsCurrency;
  const examplePrice = formatPrice(145000, amountsCurrency, "en");
  const relabelledPrice = formatPrice(145000, currency, "en");
  const year = new Date().getFullYear();

  return (
    <>
      <div className="z-40 border-t border-on-accent/15 bg-accent text-on-accent md:sticky md:top-0">
        <div className="mx-auto flex max-w-[82.5rem] flex-wrap items-center justify-between gap-x-6 gap-y-3 px-4 py-2.5 sm:px-8">
          <p className="text-sm">{t("hint")}</p>
          <div className="flex flex-wrap items-center gap-3">
            <label htmlFor="admin-currency" className="text-sm font-semibold">{t("currency")}</label>
            <select
              id="admin-currency"
              value={currency}
              onChange={(event) => {
                setCurrency(event.target.value);
                setConversion(null);
                setRateFailed(false);
              }}
              aria-describedby={unconverted || conversion ? "admin-currency-note" : undefined}
              className="min-h-10 cursor-pointer border border-on-accent bg-transparent px-3 text-sm font-semibold text-on-accent focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-on-accent [&>option]:bg-panel [&>option]:font-normal [&>option]:text-ink"
            >
              {SHOP_CURRENCIES.map((code) => (
                <option key={code} value={code}>{t("currencies", { code })}</option>
              ))}
            </select>
            <button
              type="button"
              role="switch"
              aria-checked={showPrices}
              aria-describedby="admin-show-prices-hint"
              onClick={() => setShowPrices((on) => !on)}
              className="inline-flex min-h-10 items-center gap-2.5 text-sm font-semibold focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-on-accent"
            >
              {t("showPrices")}
              <span
                aria-hidden="true"
                className={`relative h-6 w-11 rounded-full border border-on-accent ${showPrices ? "bg-on-accent" : ""}`}
              >
                <span
                  className={`absolute top-0.5 left-0.5 size-4.5 rounded-full motion-safe:transition-transform ${
                    showPrices ? "translate-x-5 bg-accent" : "bg-on-accent"
                  }`}
                />
              </span>
              <span className="w-6 text-left font-normal">{showPrices ? t("showPricesOn") : t("showPricesOff")}</span>
            </button>
            <fieldset className="flex items-center gap-2.5" aria-describedby="admin-theme-hint">
              <legend className="float-left mr-2.5 text-sm font-semibold">{t("theme")}</legend>
              <span className="flex border border-on-accent">
                {(["dark", "light"] as const).map((option) => (
                  <label
                    key={option}
                    className={`inline-flex min-h-10 cursor-pointer items-center px-3 text-sm focus-within:outline-2 focus-within:outline-on-accent ${
                      theme === option ? "bg-on-accent font-semibold text-accent" : ""
                    }`}
                  >
                    <input
                      type="radio"
                      name="admin-theme"
                      value={option}
                      checked={theme === option}
                      onChange={() => setTheme(option)}
                      className="sr-only"
                    />
                    {t("themes", { theme: option })}
                  </label>
                ))}
              </span>
            </fieldset>
            <label className="relative inline-flex min-h-10 cursor-pointer items-center border border-on-accent px-3.5 text-sm font-semibold focus-within:outline-2 focus-within:outline-on-accent">
              {t("upload")}
              <input
                type="file"
                multiple
                accept="image/jpeg,image/png,image/webp"
                onChange={(event) => {
                  if (event.target.files) void addWorks(event.target.files);
                  event.target.value = "";
                }}
                className="sr-only"
              />
            </label>
            <span role="status" className="text-sm">
              {dirty ? (
                <strong className="font-semibold"><span aria-hidden="true">● </span>{t("dirty")}</strong>
              ) : (
                t("clean")
              )}
            </span>
            <button
              type="button"
              onClick={publish}
              disabled={!dirty || publishing || uploading !== null}
              className="min-h-10 bg-on-accent px-4.5 text-sm font-semibold text-accent disabled:opacity-60"
            >
              {publishing ? t("publishing") : t("publish")}
            </button>
          </div>
          {unconverted && (
            <div id="admin-currency-note" className="flex w-full flex-wrap items-center gap-x-4 gap-y-2 text-sm">
              <p>{t("currencyNote", { example: examplePrice, converted: relabelledPrice })}</p>
              <button
                type="button"
                onClick={convertPrices}
                disabled={converting}
                className="min-h-10 border border-on-accent px-3.5 font-semibold disabled:opacity-60"
              >
                {converting ? t("converting") : t("convert", { from: amountsCurrency, to: currency })}
              </button>
              {rateFailed && <p role="alert" className="font-semibold">{t("convertFailed")}</p>}
            </div>
          )}
          {!unconverted && conversion && (
            <div id="admin-currency-note" className="flex w-full flex-wrap items-center gap-x-4 gap-y-2 text-sm">
              <p role="status">
                {t("converted", {
                  from: conversion.from,
                  to: conversion.to,
                  rate: new Intl.NumberFormat("en", { maximumFractionDigits: 4 }).format(conversion.rate / RATE_SCALE),
                  date: new Date(`${conversion.date}T12:00:00Z`),
                })}
              </p>
              <button type="button" onClick={undoConversion} className="min-h-10 underline underline-offset-4">
                {t("undoConvert")}
              </button>
            </div>
          )}
          <p id="admin-theme-hint" className={theme !== saved.theme ? "w-full text-sm" : "sr-only"}>
            {t("themeHint")}
          </p>
          {/* Read out with the switch; shown once it differs from what is live. */}
          <p id="admin-show-prices-hint" className={showPrices !== saved.showPrices ? "w-full text-sm" : "sr-only"}>
            {t("showPricesHint")}
          </p>
        </div>
      </div>

      <div role="status" aria-live="polite" className="mx-auto max-w-[82.5rem] px-4 sm:px-8">
        {(notice || uploading || uploadErrors.length > 0) && (
          <div className="mt-4 space-y-1 border-l-2 border-accent bg-panel px-4 py-3 text-sm">
            {notice?.kind === "published" && <p>{t("published")}</p>}
            {notice?.kind === "publishErrors" && <p className="text-warn">{t("publishErrors", { count: notice.count })}</p>}
            {notice?.kind === "publishFailed" && <p className="text-warn">{t("publishFailed")}</p>}
            {notice?.kind === "deleted" && <p>{t("deleted", { title: notice.title })}</p>}
            {notice?.kind === "deleteFailed" && <p className="text-warn">{t("deleteFailed", { title: notice.title })}</p>}
            {uploading && <p>{t("uploading", { name: uploading })}</p>}
            {uploadErrors.map((problem) => (
              <p key={problem.name} className="text-warn">
                {tForm("uploadErrors", { error: problem.error, name: problem.name })}
              </p>
            ))}
          </div>
        )}
      </div>

      {/* The storefront header, as visitors see it (a picture of it, not links). */}
      <div aria-hidden="true" className="border-b border-line">
        <div className="label-caps site-container flex items-center justify-between gap-6 py-4 lg:py-5">
          <span className="font-semibold">{SITE_NAME}</span>
          <span className="hidden gap-8 md:flex">
            <span>{tNav("originals")}</span>
            <span>{tNav("commissions")}</span>
            <span>{tNav("about")}</span>
            <span>{tNav("contact")}</span>
            {showPrices && <span className="text-accent">{tCart("text", { count: 0 })}</span>}
          </span>
        </div>
      </div>

      <main className="site-container">
        <OriginalsIntro />

        {works.length === 0 && <p className="mb-6 text-muted">{t("empty")}</p>}

        <ul aria-label={t("listLabel")} className={GRID_CLASS}>
          {works.map((work, index) => (
            <li key={work.key}>
              <WorkCard
                work={work}
                index={index}
                total={works.length}
                currency={currency}
                showPrices={showPrices}
                liveHref={saved.live.has(work.key) ? `/${routing.defaultLocale}/originals/${saved.live.get(work.key)}` : null}
                selected={work.key === selectedKey}
                needsAttention={Boolean(errors[work.key])}
                dragging={work.key === dragKey}
                dropTarget={work.key === overKey && dragKey !== null && dragKey !== work.key}
                onMove={(to) => move(index, to)}
                onEdit={(button) => {
                  editButton.current = button;
                  setSelectedKey(work.key);
                }}
                onDragStart={(event) => onCardDragStart(event, work.key)}
                onDragOver={(event) => {
                  event.preventDefault();
                  if (overKey !== work.key) setOverKey(work.key);
                }}
                onDragLeave={() => setOverKey((key) => (key === work.key ? null : key))}
                onDrop={(event) => onCardDrop(event, index)}
                onDragEnd={() => {
                  setDragKey(null);
                  setOverKey(null);
                }}
              />
            </li>
          ))}
          <li>
            <label
              onDragOver={(event) => event.preventDefault()}
              onDrop={(event) => {
                event.preventDefault();
                if (event.dataTransfer.files.length > 0) void addWorks(event.dataTransfer.files);
              }}
              className="flex h-full min-h-[22rem] cursor-pointer flex-col items-center justify-center gap-3.5 border-[1.5px] border-dashed border-control bg-well p-10 text-center focus-within:outline-2 focus-within:outline-ink lg:min-h-[32.5rem] xl:min-h-[26rem]"
            >
              <svg aria-hidden="true" width="36" height="36" viewBox="0 0 24 24" fill="none" className="stroke-accent" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 16V4" />
                <path d="M7 9l5-5 5 5" />
                <path d="M4 16v3a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-3" />
              </svg>
              <span className="font-serif text-[1.875rem]">{t("addTitle")}</span>
              <span className="text-[0.9375rem] whitespace-pre-line text-muted">{t("addHint")}</span>
              <input
                type="file"
                multiple
                accept="image/jpeg,image/png,image/webp"
                onChange={(event) => {
                  if (event.target.files) void addWorks(event.target.files);
                  event.target.value = "";
                }}
                className="sr-only"
              />
            </label>
          </li>
        </ul>
      </main>

      {/* The storefront footer, as visitors see it. */}
      <div aria-hidden="true" className="mt-24 border-t border-line text-sm text-faint">
        <div className="site-container flex flex-wrap justify-between gap-6 py-10">
          <span>{tFooter("copyright", { year, siteName: SITE_NAME })}</span>
          <span className="flex gap-6">
            <span>{tFooter("instagram")}</span>
            <span>{tFooter("contact")}</span>
          </span>
        </div>
      </div>

      {selected && (
        <EditPanel
          key={selected.key}
          work={selected}
          index={selectedIndex}
          currency={currency}
          showPrices={showPrices}
          savedPriceMode={saved.modes.get(selected.key) ?? null}
          errors={errors[selected.key] ?? {}}
          onChange={(patch) => update(selected.key, patch)}
          onReplaceCover={(file) => void replaceCover(selected, file)}
          onAddImages={(files) => void addImages(selected, files)}
          onRemoveImage={(image) => {
            update(selected.key, { images: selected.images.filter((item) => item !== image) });
            discard([image]);
          }}
          onDelete={() => void deleteWork(selected)}
          deleting={deleting}
          onClose={closePanel}
        />
      )}
    </>
  );
}
