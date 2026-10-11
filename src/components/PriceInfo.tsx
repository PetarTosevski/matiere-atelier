import { useTranslations } from "next-intl";
import { DisplayPrice } from "@/components/currency/DisplayPrice";
import type { PriceView } from "@/lib/pricing";
import type { Status } from "@/lib/types";

// Render-only helpers for a PriceView. They never decide whether a price is
// shown: a hidden price is already null by the time it gets here.

export function FormattedPrice({
  price,
}: {
  price: NonNullable<PriceView["price"]>;
}) {
  // Only the visible price reaches the browser, for the visitor's currency choice.
  return <DisplayPrice price={{ amount: price.amount, currency: price.currency }} />;
}

export function AvailabilityLabel({ availability }: { availability: Status }) {
  const t = useTranslations("Artwork");
  return availability === "SOLD" ? t("soldOut") : t("available");
}
