"use client";

import { useTranslations } from "next-intl";
import { useActionState } from "react";
import { saveSettingsAction, type SettingsState } from "@/app/admin/actions";

const initialState: SettingsState = { saved: false };

/** The "Show prices" switch. It writes only SiteSettings.showPrices. */
export function SettingsForm({ showPrices }: { showPrices: boolean }) {
  const t = useTranslations("Admin.settings");
  const [state, formAction, pending] = useActionState(saveSettingsAction, initialState);

  return (
    <form action={formAction} className="mt-8 space-y-6">
      <div>
        <label className="flex items-center gap-3">
          <input
            type="checkbox"
            role="switch"
            name="showPrices"
            defaultChecked={showPrices}
            aria-describedby="show-prices-hint"
            className="size-5 accent-ink"
          />
          <span>{t("showPrices")}</span>
        </label>
        <p id="show-prices-hint" className="mt-2 text-sm text-muted">
          {t("showPricesHint")}
        </p>
      </div>
      <div className="flex items-center gap-4">
        <button type="submit" disabled={pending} className="button-primary">
          {t("save")}
        </button>
        <p role="status">{state.saved && !pending ? t("saved") : null}</p>
      </div>
    </form>
  );
}
