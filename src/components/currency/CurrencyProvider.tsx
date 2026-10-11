"use client";

import { createContext, useContext, useSyncExternalStore, type ReactNode } from "react";
import { convertAmount } from "@/lib/money";
import { currencyStore } from "./currency-store";

type CurrencyContextValue = {
  /** The shop currency: what the artist sets and what orders are in. */
  shop: string;
  /** Currencies a visitor can pick, the shop currency first. */
  options: string[];
  /** The currency prices are shown in. */
  selected: string;
  select: (code: string) => void;
  /** Rate in millionths from the shop currency, or undefined. */
  rateFor: (code: string) => number | undefined;
};

const CurrencyContext = createContext<CurrencyContextValue | null>(null);

/**
 * Lets visitors view prices in another currency. Rates come from the server
 * (lib/exchange-rates.ts); without them only the shop currency is offered.
 * The server and the first render always use the shop currency, so the page
 * matches the HTML before the remembered choice is applied.
 */
export function CurrencyProvider({
  shop,
  rates,
  children,
}: {
  shop: string;
  rates: Record<string, number> | null;
  children: ReactNode;
}) {
  const stored = useSyncExternalStore(
    currencyStore.subscribe,
    currencyStore.getSnapshot,
    currencyStore.getServerSnapshot,
  );
  const options = [shop, ...Object.keys(rates ?? {}).filter((code) => code !== shop)];
  const selected = stored && options.includes(stored) ? stored : shop;

  const value: CurrencyContextValue = {
    shop,
    options,
    selected,
    select: (code) => currencyStore.set(code === shop ? null : code),
    rateFor: (code) => (code === shop ? undefined : rates?.[code]),
  };

  return <CurrencyContext.Provider value={value}>{children}</CurrencyContext.Provider>;
}

export function useCurrency(): CurrencyContextValue | null {
  return useContext(CurrencyContext);
}

/**
 * A price as the visitor sees it: in the shop currency, or converted to the
 * chosen one and rounded to a whole amount (approximate).
 */
export function useDisplayPrice(price: { amount: number; currency: string }): {
  amount: number;
  currency: string;
  approximate: boolean;
} {
  const currency = useCurrency();
  const rate = currency && price.currency === currency.shop ? currency.rateFor(currency.selected) : undefined;
  if (!currency || rate === undefined) return { ...price, approximate: false };
  return { amount: convertAmount(price.amount, rate), currency: currency.selected, approximate: true };
}
