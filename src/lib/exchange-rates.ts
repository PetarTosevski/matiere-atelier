import "server-only";
import { z } from "zod";
import { SHOP_CURRENCIES } from "@/lib/currency";
import { RATE_SCALE } from "@/lib/money";

// Exchange rates for the admin's "Convert prices" and the visitor currency
// switcher: the European Central Bank reference rates, through the free
// Frankfurter API (no key, updated on working days around 16:00 CET).

const API = "https://api.frankfurter.dev/v1/latest";

const responseSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  rates: z.record(z.string(), z.number().positive()),
});

export type ExchangeRate = { rate: number; date: string };

/** Today's rate from one currency to another, in millionths; null when unavailable. */
export async function getExchangeRate(from: string, to: string): Promise<ExchangeRate | null> {
  const url = `${API}?base=${encodeURIComponent(from)}&symbols=${encodeURIComponent(to)}`;
  try {
    const response = await fetch(url, { signal: AbortSignal.timeout(8000), next: { revalidate: 3600 } });
    if (!response.ok) return null;
    const parsed = responseSchema.safeParse(await response.json());
    const rate = parsed.success ? parsed.data.rates[to] : undefined;
    if (!parsed.success || rate === undefined) return null;
    return { rate: Math.round(rate * RATE_SCALE), date: parsed.data.date };
  } catch (error) {
    console.error("[admin] exchange rate lookup failed", error);
    return null;
  }
}

export type ExchangeRates = {
  /** The shop currency the rates start from. */
  base: string;
  /** Rate in millionths per currency, the base included (1_000_000). */
  rates: Record<string, number>;
  date: string;
};

/**
 * Today's rates from the shop currency to every other shop currency, for
 * visitors who view prices in their own currency. Cached for an hour; null
 * when unavailable (the site then shows only the shop currency).
 */
export async function getExchangeRates(base: string): Promise<ExchangeRates | null> {
  const others = SHOP_CURRENCIES.filter((code) => code !== base);
  const url = `${API}?base=${encodeURIComponent(base)}&symbols=${others.join(",")}`;
  try {
    const response = await fetch(url, { signal: AbortSignal.timeout(8000), next: { revalidate: 3600 } });
    if (!response.ok) return null;
    const parsed = responseSchema.safeParse(await response.json());
    if (!parsed.success) return null;
    const rates: Record<string, number> = { [base]: RATE_SCALE };
    for (const code of others) {
      const rate = parsed.data.rates[code];
      if (rate !== undefined) rates[code] = Math.round(rate * RATE_SCALE);
    }
    return { base, rates, date: parsed.data.date };
  } catch (error) {
    console.error("[site] exchange rates lookup failed", error);
    return null;
  }
}
