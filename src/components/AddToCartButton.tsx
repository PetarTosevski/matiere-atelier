"use client";

import { useTranslations } from "next-intl";
import { useState } from "react";
import { useCart } from "@/components/cart/CartProvider";
import { Link } from "@/i18n/navigation";

type Props = { artworkId: string };

/** Each original is unique: no quantity, and once added it reads "In cart". */
export function AddToCartButton({ artworkId }: Props) {
  const t = useTranslations("Artwork");
  const { has, add } = useCart();
  const [justAdded, setJustAdded] = useState(false);
  const inCart = has(artworkId);

  return (
    <div>
      {inCart ? (
        <button
          type="button"
          data-cart-action
          aria-disabled="true"
          className="button-primary w-full opacity-70 sm:w-auto"
        >
          {t("inCart")}
        </button>
      ) : (
        <button
          type="button"
          data-cart-action
          onClick={() => {
            add(artworkId);
            setJustAdded(true);
          }}
          className="button-primary w-full sm:w-auto"
        >
          {t("addToCart")}
        </button>
      )}

      <div role="status" className="mt-4">
        {inCart && (
          <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
            {justAdded && <p>{t("addedToCart")}</p>}
            <Link href="/cart" className="link">
              {t("viewCart")}
            </Link>
            {justAdded && (
              <Link href="/originals" className="link">
                {t("continueBrowsing")}
              </Link>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
