"use client";

import { useLocale, useTranslations } from "next-intl";
import { useId } from "react";
import { currencySymbol } from "@/lib/currency";
import { useCurrency } from "./CurrencyProvider";

/** Lets the visitor view prices in another currency. Hidden without rates. */
export function CurrencySwitcher() {
  const t = useTranslations("CurrencySwitcher");
  const locale = useLocale();
  const id = useId();
  const currency = useCurrency();
  if (!currency || currency.options.length < 2) return null;

  return (
    <div className="flex items-center">
      <label htmlFor={id} className="sr-only">
        {t("label")}
      </label>
      <select
        id={id}
        value={currency.selected}
        onChange={(event) => currency.select(event.target.value)}
        className="field-sizing-content min-h-11 cursor-pointer bg-transparent pr-1 tracking-[inherit] text-inherit uppercase [&>option]:bg-panel [&>option]:text-ink [&>option]:normal-case"
      >
        {currency.options.map((code) => {
          const symbol = currencySymbol(code, locale);
          return (
            <option key={code} value={code}>
              {t("option", { code, symbol: symbol === code ? "none" : symbol })}
            </option>
          );
        })}
      </select>
    </div>
  );
}
