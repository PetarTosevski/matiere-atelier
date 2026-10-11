"use client";

import { useLocale, useTranslations } from "next-intl";
import { formatPrice } from "@/lib/format";
import { useDisplayPrice } from "./CurrencyProvider";

/**
 * Renders a price that is already visible (never decides that itself), in
 * the visitor's chosen currency. A converted price is marked "≈".
 */
export function DisplayPrice({ price }: { price: { amount: number; currency: string } }) {
  const t = useTranslations("CurrencySwitcher");
  const locale = useLocale();
  const shown = useDisplayPrice(price);
  const text = formatPrice(shown.amount, shown.currency, locale);
  if (!shown.approximate) return text;
  return (
    <>
      <span aria-hidden="true">≈ </span>
      <span className="sr-only">{t("approx")} </span>
      {text}
    </>
  );
}
