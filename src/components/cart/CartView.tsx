"use client";

import Image from "next/image";
import { useLocale, useTranslations } from "next-intl";
import { useState } from "react";
import { InquiryForm } from "@/components/InquiryForm";
import { Link } from "@/i18n/navigation";
import { subtotals } from "@/lib/cart";
import { DisplayPrice } from "@/components/currency/DisplayPrice";
import { useCurrency } from "@/components/currency/CurrencyProvider";
import { formatPrice } from "@/lib/format";
import { useCart } from "./CartProvider";

/** The cart page: server-checked items, subtotal and the order request form. */
export function CartView() {
  const t = useTranslations("Cart");
  const locale = useLocale();
  const { hydrated, items, remove, clear, refresh } = useCart();
  const currency = useCurrency();
  const converted = currency !== null && currency.selected !== currency.shop;
  const [orderSent, setOrderSent] = useState(false);

  if (orderSent) {
    return (
      <InquirySuccess title={t("orderSentTitle")} body={t("orderSentBody")} />
    );
  }

  if (!hydrated || items === null) {
    return <p className="mt-6 text-muted">{t("loading")}</p>;
  }

  if (items.length === 0) {
    return (
      <div className="mt-6 text-muted">
        <p>{t("empty")}</p>
        <p className="mt-4">
          <Link href="/originals" className="link text-ink">
            {t("browseOriginals")}
          </Link>
        </p>
      </div>
    );
  }

  return (
    <div className="mt-8 grid gap-12 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)] lg:gap-16">
      <section aria-labelledby="cart-items">
        <h2 id="cart-items" className="sr-only">
          {t("itemsHeading")}
        </h2>
        <ul className="divide-y divide-line border-y border-line">
          {items.map((item) => (
            <li key={item.id} className="flex items-center gap-4 py-4 sm:gap-6">
              <span className="relative block size-20 shrink-0 sm:size-24">
                {item.image && (
                  <Image
                    src={item.image.src}
                    alt={item.image.alt}
                    fill
                    sizes="6rem"
                    className="object-contain"
                  />
                )}
              </span>
              <div className="min-w-0 flex-1">
                <Link href={`/originals/${item.slug}`} className="link">
                  {item.title}
                </Link>
                <p className="mt-1">
                  <DisplayPrice price={item.price} />
                </p>
              </div>
              <button
                type="button"
                onClick={() => remove(item.id)}
                aria-label={t("removeLabel", { title: item.title })}
                className="link min-h-11 text-sm text-muted"
              >
                {t("remove")}
              </button>
            </li>
          ))}
        </ul>
        <p className="mt-6 flex justify-between text-lg">
          <span>{t("subtotal")}</span>
          <span>
            {subtotals(items).map((total, index) => (
              <span key={total.currency}>
                {index > 0 && " + "}
                <DisplayPrice price={total} />
              </span>
            ))}
          </span>
        </p>
        {converted && (
          <p className="mt-2 text-sm text-muted">
            {t("currencyNote", {
              currency: currency.selected,
              shop: currency.shop,
              total: subtotals(items)
                .map((total) => formatPrice(total.amount, total.currency, locale))
                .join(" + "),
            })}
          </p>
        )}
        <p className="mt-2 text-sm text-muted">{t("subtotalNote")}</p>
      </section>

      <section aria-labelledby="checkout">
        <h2 id="checkout" className="font-serif text-3xl">
          {t("checkoutHeading")}
        </h2>
        <p className="mt-2 mb-8 text-muted">{t("checkoutIntro")}</p>
        <InquiryForm
          type="ORDER"
          hidden={{ artworkIds: items.map((item) => item.id) }}
          onSuccess={() => {
            setOrderSent(true);
            clear();
          }}
          onCartChanged={refresh}
        />
      </section>
    </div>
  );
}

function InquirySuccess({ title, body }: { title: string; body: string }) {
  return (
    <div role="status" className="mt-6 max-w-prose">
      <h2 className="font-serif text-3xl">{title}</h2>
      <p className="mt-2 text-muted">{body}</p>
    </div>
  );
}
