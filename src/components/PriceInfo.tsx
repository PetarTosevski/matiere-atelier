import { useLocale, useTranslations } from "next-intl";
import { formatPrice } from "@/lib/format";
import type { PriceView } from "@/lib/pricing";
import type { Status } from "@/lib/types";

// Render-only helpers for a PriceView. They never decide whether a price is
// shown: a hidden price is already null by the time it gets here.

export function FormattedPrice({
  price,
}: {
  price: NonNullable<PriceView["price"]>;
}) {
  const locale = useLocale();
  return formatPrice(price.amount, price.currency, locale);
}

export function AvailabilityLabel({ availability }: { availability: Status }) {
  const t = useTranslations("Artwork");
  return availability === "SOLD" ? t("soldOut") : t("available");
}
