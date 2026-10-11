import { describe, expect, it } from "vitest";
import { artworks } from "@/data/artworks";
import { resolveCart, subtotals } from "@/lib/cart";

const shop = { showPrices: true, currency: "EUR" };
const showcase = { showPrices: false, currency: "EUR" };
const id = (slug: string) => artworks.find((a) => a.slug === slug)!.id;

describe("resolveCart", () => {
  it("keeps priced, available, published pieces with their server price", () => {
    const { items, removed } = resolveCart([id("low-tide")], artworks, shop);
    expect(removed).toEqual([]);
    expect(items).toEqual([
      expect.objectContaining({
        slug: "low-tide",
        title: "Low Tide",
        price: { amount: 145000, currency: "EUR" },
      }),
    ]);
  });

  it("drops sold pieces and names them", () => {
    const { items, removed } = resolveCart([id("harbour-wall")], artworks, shop);
    expect(items).toEqual([]);
    expect(removed).toEqual([
      { id: id("harbour-wall"), title: "Harbour Wall", reason: "SOLD" },
    ]);
  });

  it("drops pieces that are no longer priced (Display and Auction)", () => {
    const { removed } = resolveCart(
      [id("study-in-umber"), id("weather-front")],
      artworks,
      shop,
    );
    expect(removed.map((r) => r.reason)).toEqual(["NOT_PRICED", "NOT_PRICED"]);
  });

  it("drops drafts and unknown IDs without revealing a title", () => {
    const { items, removed } = resolveCart(
      [id("untitled-draft"), "does-not-exist"],
      artworks,
      shop,
    );
    expect(items).toEqual([]);
    expect(removed).toEqual([
      { id: id("untitled-draft"), title: null, reason: "UNAVAILABLE" },
      { id: "does-not-exist", title: null, reason: "UNAVAILABLE" },
    ]);
  });

  it("never returns a price in showcase mode", () => {
    const all = artworks.map((a) => a.id);
    const { items, removed } = resolveCart(all, artworks, showcase);
    expect(items).toEqual([]);
    expect(JSON.stringify(removed)).not.toMatch(/amount|price|\d{4,}/);
  });

  it("counts a piece once even if its ID repeats", () => {
    const { items } = resolveCart([id("low-tide"), id("low-tide")], artworks, shop);
    expect(items).toHaveLength(1);
  });

  it("keeps the visitor's order", () => {
    const { items } = resolveCart(
      [id("quiet-orchard"), id("low-tide")],
      artworks,
      shop,
    );
    expect(items.map((i) => i.slug)).toEqual(["quiet-orchard", "low-tide"]);
  });
});

describe("subtotals", () => {
  it("adds integer minor units per currency", () => {
    expect(
      subtotals([
        { price: { amount: 145000, currency: "EUR" } },
        { price: { amount: 64050, currency: "EUR" } },
        { price: { amount: 1000, currency: "USD" } },
      ]),
    ).toEqual([
      { amount: 209050, currency: "EUR" },
      { amount: 1000, currency: "USD" },
    ]);
  });

  it("is empty for an empty cart", () => {
    expect(subtotals([])).toEqual([]);
  });
});
