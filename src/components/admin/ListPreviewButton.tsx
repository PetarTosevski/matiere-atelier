"use client";

import { useTranslations } from "next-intl";
import { useState } from "react";
import type { PreviewContext } from "@/app/admin/preview-context";
import { PreviewDialog } from "@/components/admin/PreviewDialog";

/** "Preview page" on the artwork list: Originals as visitors see it now. */
export function ListPreviewButton({ preview }: { preview: PreviewContext }) {
  const t = useTranslations("Admin.form");
  const [open, setOpen] = useState(false);

  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className="button-quiet">
        {t("previewButton")}
      </button>
      <PreviewDialog
        open={open}
        onClose={() => setOpen(false)}
        pieces={preview.pieces}
        focusId={null}
        showPrices={preview.showPrices}
      />
    </>
  );
}
