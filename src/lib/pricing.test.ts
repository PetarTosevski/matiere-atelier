import { describe, expect, it } from "vitest";
import { getPriceView, isCartEnabled } from "@/lib/pricing";
import type { Artwork, PriceMode, Status } from "@/lib/types";

type PricedItem = Pick<
  Artwork,
  "priceMode" | "priceAmount" | "currency" | "status"
>;

const shop = { showPrices: true, currency: "EUR", theme: "dark" as const };
const showcase = { showPrices: false, currency: "EUR", theme: "dark" as const };

function item(overrides: Partial<PricedItem> = {}): PricedItem {
  return {
    priceMode: "PRICE",
    priceAmount: 145000,
    currency: "EUR",
    status: "AVAILABLE",
    ...overrides,
  };
}

const modes: PriceMode[] = ["PRICE", "DISPLAY", "AUCTION"];
const statuses: Status[] = ["AVAILABLE", "SOLD"];

describe("getPriceView", () => {
  describe("price table", () => {
    it("PRICE + AVAILABLE shows the price and offers Add to cart", () => {
      expect(getPriceView(item(), shop)).toEqual({
        price: { amount: 145000, currency: "EUR" },
        availability: "AVAILABLE",
        action: "ADD_TO_CART",
      });
    });

    it("PRICE + SOLD shows the price, Sold out, and Request this piece", () => {
      expect(getPriceView(item({ status: "SOLD" }), shop)).toEqual({
        price: { amount: 145000, currency: "EUR" },
        availability: "SOLD",
        action: "REQUEST",
      });
    });

    it.each(statuses)(
      "DISPLAY + %s hides the stored price and offers Ask about this piece",
      (status) => {
        expect(
          getPriceView(item({ priceMode: "DISPLAY", status }), shop),
        ).toEqual({ price: null, availability: status, action: "ASK" });
      },
    );

    it.each(statuses)("AUCTION + %s renders exactly like DISPLAY", (status) => {
      const auction = getPriceView(item({ priceMode: "AUCTION", status }), shop);
      const display = getPriceView(item({ priceMode: "DISPLAY", status }), shop);
      expect(auction).toEqual(display);
      expect(auction.price).toBeNull();
    });
  });

  describe("showcase mode (showPrices off)", () => {
    const combinations = modes.flatMap((priceMode) =>
      statuses.map((status) => ({ priceMode, status })),
    );

    it.each(combinations)(
      "hides the price for $priceMode + $status but keeps availability",
      ({ priceMode, status }) => {
        expect(getPriceView(item({ priceMode, status }), showcase)).toEqual({
          price: null,
          availability: status,
          action: "ASK",
        });
      },
    );

    it("never writes to the artwork", () => {
      const artwork = Object.freeze(item());
      const before = { ...artwork };
      getPriceView(artwork, showcase);
      expect(artwork).toEqual(before);
    });

    it("restores each piece's own mode when switched back on", () => {
      const artwork = item();
      expect(getPriceView(artwork, showcase).price).toBeNull();
      expect(getPriceView(artwork, shop).price).toEqual({
        amount: 145000,
        currency: "EUR",
      });
    });
  });

  it("keeps a stored amount hidden while in DISPLAY, and shows it again in PRICE", () => {
    const stored = item({ priceMode: "DISPLAY", priceAmount: 95000 });
    expect(getPriceView(stored, shop).price).toBeNull();
    expect(getPriceView({ ...stored, priceMode: "PRICE" }, shop).price).toEqual(
      { amount: 95000, currency: "EUR" },
    );
  });

  it("treats PRICE without an amount as having no visible price", () => {
    expect(getPriceView(item({ priceAmount: null }), shop)).toEqual({
      price: null,
      availability: "AVAILABLE",
      action: "ASK",
    });
  });

  it("passes the artwork's currency through", () => {
    expect(getPriceView(item({ currency: "USD" }), shop).price).toEqual({
      amount: 145000,
      currency: "USD",
    });
  });
});

describe("isCartEnabled", () => {
  it("follows showPrices", () => {
    expect(isCartEnabled(shop)).toBe(true);
    expect(isCartEnabled(showcase)).toBe(false);
  });
});
