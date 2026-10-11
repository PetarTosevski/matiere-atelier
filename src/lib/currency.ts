// The shop currency: one currency for the whole site, chosen in the admin.
// Switching it relabels every price; amounts are not converted.

/**
 * Currencies the shop can use. All have two decimal places, so a stored
 * amount in minor units keeps its meaning when the currency changes.
 */
export const SHOP_CURRENCIES = ["EUR", "USD", "GBP", "CHF", "SEK"] as const;

export type ShopCurrency = (typeof SHOP_CURRENCIES)[number];

export const DEFAULT_CURRENCY: ShopCurrency = "EUR";

export function isShopCurrency(value: unknown): value is ShopCurrency {
  return typeof value === "string" && (SHOP_CURRENCIES as readonly string[]).includes(value);
}

/** The symbol shown before the price field, such as "€" or "kr". */
export function currencySymbol(currency: string, locale: string): string {
  const part = new Intl.NumberFormat(locale, {
    style: "currency",
    currency,
    currencyDisplay: "narrowSymbol",
  })
    .formatToParts(0)
    .find((item) => item.type === "currency");
  return part?.value ?? currency;
}
