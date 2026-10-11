"use client";

import { useTranslations } from "next-intl";
import { useEffect, useRef, useState } from "react";
import { deleteArtworkAction } from "@/app/admin/actions";

/** Delete in two steps: the first click asks, the second deletes. */
export function ConfirmDelete({ id, title }: { id: string; title: string }) {
  const t = useTranslations("Admin.list");
  const [asking, setAsking] = useState(false);
  const confirmRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (asking) confirmRef.current?.focus();
  }, [asking]);

  if (!asking) {
    return (
      <button
        type="button"
        onClick={() => setAsking(true)}
        aria-label={t("deleteLabel", { title })}
        className="link min-h-9"
      >
        {t("delete")}
      </button>
    );
  }

  return (
    <form action={deleteArtworkAction} role="group" aria-label={t("deleteLabel", { title })} className="flex flex-wrap items-center gap-3">
      <input type="hidden" name="id" value={id} />
      <span>{t("confirmDelete", { title })}</span>
      <button ref={confirmRef} type="submit" className="button-quiet min-h-9 px-2 py-1">
        {t("confirmDeleteButton")}
      </button>
      <button type="button" onClick={() => setAsking(false)} className="link min-h-9">
        {t("cancel")}
      </button>
    </form>
  );
}
