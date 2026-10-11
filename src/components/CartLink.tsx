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
      className="inline-flex min-h-11 items-center gap-1.5"
    >
      <svg
        aria-hidden="true"
        viewBox="0 0 24 24"
        className="size-5"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
      >
        <path d="M5 8h14l-1.2 12H6.2L5 8Z" />
        <path d="M9 10V6a3 3 0 0 1 6 0v4" />
      </svg>
      <span aria-hidden="true" className="tabular-nums">
        {count}
      </span>
    </Link>
  );
}
