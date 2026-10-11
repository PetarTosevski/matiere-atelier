"use client";

import { useTranslations } from "next-intl";

type Props = { artworkId: string };

// TODO(cart session): add the ID to the cart (localStorage, IDs only), switch
// the label to "In cart" and show the "View cart" / "Continue browsing"
// confirmation. Until then the button does nothing.
export function AddToCartButton({ artworkId }: Props) {
  const t = useTranslations("Artwork");

  return (
    <button
      type="button"
      data-artwork-id={artworkId}
      className="button-primary w-full sm:w-auto"
    >
      {t("addToCart")}
    </button>
  );
}
