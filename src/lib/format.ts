import { currencyDisplay, hasMinorUnit } from "@/lib/currency";

/**
 * Formats an amount in hundredths of the main unit (cents for EUR; see
 * lib/currency.ts) for display. Uses the currency's narrow symbol where it is
 * unambiguous (always € for EUR) and drops the decimals when the amount is
 * whole. Currencies without cents (JPY, KRW) never show decimals.
 */
export function formatPrice(
  amountMinor: number,
  currency: string,
  locale: string,
): string {
  if (!Number.isSafeInteger(amountMinor)) {
    throw new RangeError(
      `Price must be an integer number of minor units, got ${amountMinor}`,
    );
  }

  const digits = amountMinor % 100 === 0 || !hasMinorUnit(currency) ? 0 : 2;

  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency,
    currencyDisplay: currencyDisplay(currency),
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  }).format(amountMinor / 100);
}
