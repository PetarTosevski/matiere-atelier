import { notFound } from "next/navigation";
import { hasLocale, type Locale } from "next-intl";
import { routing } from "./routing";

/** Narrows a route's `locale` param, returning 404 for anything unsupported. */
export function toLocale(value: string): Locale {
  if (!hasLocale(routing.locales, value)) notFound();
  return value;
}
