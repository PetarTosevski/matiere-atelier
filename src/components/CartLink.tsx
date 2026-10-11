"use client";

import { useTranslations } from "next-intl";
import { useCart } from "@/components/cart/CartProvider";
import { Link } from "@/i18n/navigation";

export function CartLink() {
  const t = useTranslations("CartLink");
  const { ids } = useCart();
  const count = ids.length;

  return (
    <Link
      href="/cart"
      aria-label={t("label", { count })}
      className="inline-flex min-h-11 items-center px-2 text-accent hover:underline hover:underline-offset-8 md:px-0"
    >
      <span aria-hidden="true" className="tabular-nums">
        {t("text", { count })}
      </span>
    </Link>
  );
}
