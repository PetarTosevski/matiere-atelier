"use client";

import Image from "next/image";
import { useTranslations } from "next-intl";
import { useActionState, useEffect, useId, useRef, useState } from "react";
import { discardUploadsAction, saveAboutAction, type AboutState } from "@/app/admin/actions";
import { MarkdownField } from "@/components/admin/MarkdownField";
import { uploadImage, type UploadProblem } from "@/components/admin/collection/upload";
import type { AboutFieldError } from "@/lib/about-form";
import { routing } from "@/i18n/routing";
import type { AboutPageForAdmin } from "@/lib/pages";

type Portrait = {
  storageId: string;
  src: string;
  width: number;
  height: number;
  alt: string;
  /** Uploaded in this session and not saved yet. */
  isNew: boolean;
};

const initialState: AboutState = { status: "idle" };
const inputClass =
  "mt-2 block w-full border border-ink/40 bg-field px-3 py-2.5 aria-[invalid=true]:border-2 aria-[invalid=true]:border-ink";

/** The About page editor: portrait and bio. The heading stays fixed. */
export function AboutForm({ about, placeholderBio }: { about: AboutPageForAdmin | null; placeholderBio: string }) {
  const t = useTranslations("Admin.about");
  const tForm = useTranslations("Admin.form");
  const id = useId();
  const [state, formAction, pending] = useActionState(saveAboutAction, initialState);
  const statusRef = useRef<HTMLDivElement>(null);

  const [bio, setBio] = useState(about?.bio ?? "");
  const [portrait, setPortrait] = useState<Portrait | null>(
    about?.portrait ? { ...about.portrait, isNew: false } : null,
  );
  const [uploading, setUploading] = useState<string | null>(null);
  const [uploadError, setUploadError] = useState<{ name: string; error: UploadProblem } | null>(null);

  useEffect(() => {
    if (state.status !== "idle") statusRef.current?.focus();
  }, [state]);

  // Once saved, the portrait belongs to the page: removing or replacing it
  // must no longer delete the file straight away (saving does that).
  const [savedState, setSavedState] = useState(state);
  if (state !== savedState) {
    setSavedState(state);
    if (state.status === "saved" && portrait?.isNew) setPortrait({ ...portrait, isNew: false });
  }

  const errorKey = (key: "bio" | "portrait") => state.errors?.[key] as AboutFieldError | undefined;
  const fieldError = (key: "bio" | "portrait") => {
    const error = errorKey(key);
    return error ? t(`errors.${error}`) : null;
  };

  /** Swapping or removing an unsaved upload deletes it right away. */
  function replacePortrait(next: Portrait | null) {
    if (portrait?.isNew && portrait.storageId !== next?.storageId) {
      void discardUploadsAction([portrait.storageId]);
    }
    setPortrait(next);
  }

  async function upload(file: File | undefined) {
    if (!file) return;
    setUploadError(null);
    setUploading(file.name);
    const result = await uploadImage(file);
    if (result.ok) replacePortrait({ ...result.image, alt: portrait?.alt ?? "", isNew: true });
    else setUploadError({ name: file.name, error: result.error });
    setUploading(null);
  }

  const portraitJson = JSON.stringify(
    portrait ? { storageId: portrait.storageId, width: portrait.width, height: portrait.height, alt: portrait.alt } : null,
  );

  return (
    <form action={formAction} noValidate className="mt-8 space-y-10">
      <input type="hidden" name="portrait" value={portraitJson} />

      <div ref={statusRef} tabIndex={-1} role="status" className="focus:outline-none">
        {state.status === "saved" && !pending && <p>{t("saved")}</p>}
        {state.status === "error" && (
          <p className="border-l-2 border-ink pl-3">{state.failed ? tForm("saveFailed") : tForm("formError")}</p>
        )}
      </div>

      <fieldset>
        <legend className="text-lg">{t("portrait")}</legend>
        <p id={`${id}-portrait-hint`} className="mt-1 text-sm text-muted">{t("portraitHint")}</p>
        {fieldError("portrait") && <p className="mt-2 text-sm">{fieldError("portrait")}</p>}

        {portrait ? (
          <div className="mt-4 grid max-w-2xl gap-4 sm:grid-cols-[12rem_minmax(0,1fr)]">
            <div className="relative aspect-[4/5] border border-line bg-field">
              <Image src={portrait.src} alt={portrait.alt} fill sizes="12rem" className="object-contain" />
            </div>
            <div>
              <label htmlFor={`${id}-alt`} className="block">{t("alt")}</label>
              <input
                id={`${id}-alt`}
                value={portrait.alt}
                onChange={(event) => setPortrait({ ...portrait, alt: event.target.value })}
                aria-invalid={errorKey("portrait") === "altRequired" ? true : undefined}
                aria-describedby={`${id}-alt-hint`}
                className={inputClass}
              />
              <p id={`${id}-alt-hint`} className="mt-1 text-sm text-muted">{t("altHint")}</p>
              <button type="button" onClick={() => replacePortrait(null)} className="link mt-3 min-h-9 text-sm">
                {t("removePortrait")}
              </button>
            </div>
          </div>
        ) : (
          <p className="mt-4 text-muted">{t("noPortrait")}</p>
        )}

        <div className="mt-4">
          <label htmlFor={`${id}-upload`} className="button-quiet cursor-pointer">
            {portrait ? t("replacePortrait") : t("addPortrait")}
          </label>
          <input
            id={`${id}-upload`}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            aria-describedby={`${id}-portrait-hint`}
            onChange={(event) => {
              void upload(event.target.files?.[0]);
              event.target.value = "";
            }}
            className="sr-only"
          />
          <div role="status" className="mt-3 text-sm">
            {uploading && <p>{tForm("uploading", { name: uploading })}</p>}
            {uploadError && <p>{tForm("uploadErrors", { error: uploadError.error, name: uploadError.name })}</p>}
          </div>
        </div>
      </fieldset>

      <MarkdownField
        id={`${id}-bio`}
        name="bio"
        label={t("bio")}
        hint={t("bioHint")}
        value={bio}
        onChange={setBio}
        placeholder={placeholderBio}
        error={fieldError("bio")}
        rows={16}
      />

      <div className="flex flex-wrap items-center gap-6 border-t border-line pt-6">
        <button type="submit" disabled={pending || uploading !== null} className="button-primary">
          {pending ? tForm("saving") : tForm("save")}
        </button>
        <a href={`/${routing.defaultLocale}/about`} target="_blank" rel="noreferrer" className="link">
          {t("viewPage")}
        </a>
      </div>
    </form>
  );
}
