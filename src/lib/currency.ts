// The shop currency: one currency for the whole site, chosen in the admin.
// Visitors can also view prices in any of these (approximate, see
// CurrencyProvider); orders are always in the shop currency.

/**
 * Currencies the shop can use. Amounts are stored in hundredths of the main
 * unit for every currency (cents for EUR), so an amount keeps its meaning when
 * the currency changes. JPY and KRW have no smaller unit: their amounts must be
 * whole (a multiple of 100).
 */
export const SHOP_CURRENCIES = [
  "EUR",
  "USD",
  "GBP",
  "CHF",
  "SEK",
  "AUD",
  "JPY",
  "CNY",
  "HKD",
  "SGD",
  "KRW",
  "INR",
] as const;

export type ShopCurrency = (typeof SHOP_CURRENCIES)[number];

export const DEFAULT_CURRENCY: ShopCurrency = "EUR";

export function isShopCurrency(value: unknown): value is ShopCurrency {
  return typeof value === "string" && (SHOP_CURRENCIES as readonly string[]).includes(value);
}

/** False for currencies without cents, such as JPY and KRW. */
export function hasMinorUnit(currency: string): boolean {
  return (
    (new Intl.NumberFormat("en", { style: "currency", currency }).resolvedOptions().maximumFractionDigits ?? 2) > 0
  );
}

// The narrow symbol of these is a plain "$" or "¥", which would read as US
// dollars or yen. They use their own symbol instead (A$, HK$, CN¥…).
const SHARED_NARROW_SYMBOL = new Set(["AUD", "CNY", "HKD", "SGD"]);

/** How Intl should show the currency: narrow symbols (€, kr) where they are unambiguous. */
export function currencyDisplay(currency: string): "narrowSymbol" | "symbol" {
  return SHARED_NARROW_SYMBOL.has(currency) ? "symbol" : "narrowSymbol";
}

/** The symbol shown before the price field, such as "€" or "kr". */
export function currencySymbol(currency: string, locale: string): string {
  const part = new Intl.NumberFormat(locale, {
    style: "currency",
    currency,
    currencyDisplay: currencyDisplay(currency),
  })
    .formatToParts(0)
    .find((item) => item.type === "currency");
  return part?.value ?? currency;
}
