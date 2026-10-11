import type { Artwork, PriceMode, SiteSettings, Status } from "@/lib/types";

// The single source of price, availability and buy-action display rules.
// Components must not decide any of this themselves (see CLAUDE.md).

export type PrimaryAction =
  /** Priced and available. */
  | "ADD_TO_CART"
  /** Priced and sold: "Request this piece" (request page). */
  | "REQUEST"
  /** No visible price: "Ask about this piece" (request page). */
  | "ASK";

export type PriceView = {
  /** Null whenever the price must not be rendered anywhere. */
  price: { amount: number; currency: string } | null;
  availability: Status;
  action: PrimaryAction;
};

type PricedItem = Pick<
  Artwork,
  "priceMode" | "priceAmount" | "currency" | "status"
>;

/** Showcase mode (showPrices off) hides the cart icon and every add-to-cart button. */
export function isCartEnabled(settings: SiteSettings): boolean {
  return settings.showPrices;
}

export function getPriceView(
  artwork: PricedItem,
  settings: SiteSettings,
): PriceView {
  const availability = artwork.status;

  if (
    !isCartEnabled(settings) ||
    !modeShowsPrice(artwork.priceMode) ||
    artwork.priceAmount === null
  ) {
    return { price: null, availability, action: "ASK" };
  }

  const price = { amount: artwork.priceAmount, currency: artwork.currency };
  return availability === "AVAILABLE"
    ? { price, availability, action: "ADD_TO_CART" }
    : { price, availability, action: "REQUEST" };
}

function modeShowsPrice(mode: PriceMode): boolean {
  switch (mode) {
    case "PRICE":
      return true;
    case "DISPLAY":
    // Auction is not offered yet and renders exactly like Display.
    case "AUCTION":
      return false;
    default: {
      const unhandled: never = mode;
      return unhandled;
    }
  }
}
