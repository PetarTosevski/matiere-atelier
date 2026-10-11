import "server-only";
import { z } from "zod";
import { RATE_SCALE } from "@/lib/money";

// Exchange rates for the admin's currency switcher: the European Central Bank
// reference rates, through the free Frankfurter API (no key, updated on
// working days around 16:00 CET).

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
