/**
 * Formats an integer amount of minor units (e.g. cents) for display.
 * Uses the currency's narrow symbol (always € for EUR) and drops the
 * decimals when the amount is whole.
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

  // Minor units per currency differ (EUR 2, JPY 0, KWD 3).
  const fractionDigits =
    new Intl.NumberFormat(locale, { style: "currency", currency })
      .resolvedOptions().maximumFractionDigits ?? 2;
  const divisor = 10 ** fractionDigits;
  const digits = amountMinor % divisor === 0 ? 0 : fractionDigits;

  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency,
    currencyDisplay: "narrowSymbol",
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  }).format(amountMinor / divisor);
}
