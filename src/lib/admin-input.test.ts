import { describe, expect, it } from "vitest";
import { parseArtworkForm, parseCentimetres } from "@/lib/artwork-form";
import type { AdminArtwork } from "@/lib/artworks";
import { amountToInput, parseAmount } from "@/lib/money";
import { slugify } from "@/lib/slug";

describe("slugify", () => {
  it("drops accents and joins words with hyphens", () => {
    expect(slugify("Matière Étude No. 2")).toBe("matiere-etude-no-2");
    expect(slugify("  Sea & Sky!  ")).toBe("sea-and-sky");
  });

  it("caps the length without a trailing hyphen", () => {
    const slug = slugify("word ".repeat(40));
    expect(slug.length).toBeLessThanOrEqual(80);
    expect(slug.endsWith("-")).toBe(false);
  });
});

describe("parseAmount", () => {
  it("turns major units into integer minor units exactly", () => {
    expect(parseAmount("1450")).toBe(145000);
    expect(parseAmount("1450.5")).toBe(145050);
    expect(parseAmount("640,50")).toBe(64050);
    expect(parseAmount(" 0.10 ")).toBe(10);
    // 0.1 + 0.2 style float errors can't happen: no float arithmetic.
    expect(parseAmount("19.99")).toBe(1999);
  });

  it("rejects anything ambiguous", () => {
    for (const input of ["1,450", "1.450,00", "12.345", "-5", "abc", "", "1e3", "€100"]) {
      expect(parseAmount(input), input).toBeNull();
    }
  });

  it("round-trips through the form value", () => {
    for (const cents of [0, 10, 64050, 145000, 1999]) {
      expect(parseAmount(amountToInput(cents))).toBe(cents);
    }
    expect(amountToInput(null)).toBe("");
  });
});

const existing: AdminArtwork = {
  id: "a1",
  slug: "low-tide",
  title: "Low Tide",
  description: "",
  priceMode: "PRICE",
  priceAmount: 145000,
  currency: "EUR",
  status: "AVAILABLE",
  published: true,
  sortOrder: 3,
  dimensions: { width: 80, height: 100 },
  images: [{ storageId: "s1", src: "https://x/1", width: 100, height: 100, alt: "" }],
  createdAt: "2026-01-01T00:00:00.000Z",
};

function form(fields: Record<string, string>) {
  const data = new FormData();
  for (const [key, value] of Object.entries(fields)) data.append(key, value);
  return data;
}

const image = JSON.stringify([{ storageId: "s1", width: 100, height: 100, alt: "" }]);

describe("parseCentimetres", () => {
  it("reads whole and decimal centimetres, with a dot or comma", () => {
    expect(parseCentimetres("61")).toBe(61);
    expect(parseCentimetres("61.5")).toBe(61.5);
    expect(parseCentimetres(" 51,25 ")).toBe(51.25);
  });

  it("rejects zero, negatives, units, ranges and absurd sizes", () => {
    for (const input of ["0", "-5", "61 cm", "61x51", "3000", "", "1.234"]) {
      expect(parseCentimetres(input), input).toBeNull();
    }
  });
});

describe("parseArtworkForm", () => {
  it("saves dimensions when both are given, and none when both are empty", () => {
    const base = { title: "A", amount: "1", images: "[]" };
    const sized = parseArtworkForm(form({ ...base, width: "61", height: "51,5" }), null, 0);
    expect(sized.ok && sized.input.dimensions).toEqual({ width: 61, height: 51.5 });
    const unsized = parseArtworkForm(form(base), null, 0);
    expect(unsized.ok && unsized.input.dimensions).toBeNull();
  });

  it("asks for both sides when only one is filled in", () => {
    const result = parseArtworkForm(form({ title: "A", amount: "1", width: "61", height: "" }), null, 0);
    expect(result).toEqual({ ok: false, errors: { dimensions: "invalidDimensions" } });
  });

  it("builds a new artwork, generating the slug and defaulting alt text", () => {
    const result = parseArtworkForm(
      form({ title: "Quiet Sea", priceMode: "PRICE", amount: "980.50", status: "AVAILABLE", published: "on", images: image }),
      null,
      -1,
    );
    expect(result).toEqual({
      ok: true,
      input: expect.objectContaining({
        slug: "quiet-sea",
        priceAmount: 98050,
        currency: "EUR",
        published: true,
        sortOrder: -1,
        images: [{ storageId: "s1", width: 100, height: 100, alt: "Quiet Sea" }],
      }),
    });
  });

  it("requires an amount in Price mode", () => {
    const result = parseArtworkForm(form({ title: "A", priceMode: "PRICE", amount: "" }), null, 0);
    expect(result).toEqual({ ok: false, errors: { amount: "amountRequired" } });
  });

  it("keeps the stored amount when switching to Display without one", () => {
    const result = parseArtworkForm(
      form({ title: "Low Tide", slug: "low-tide", priceMode: "DISPLAY", amount: "", images: image }),
      existing,
      0,
    );
    expect(result.ok && result.input.priceAmount).toBe(145000);
    expect(result.ok && result.input.priceMode).toBe("DISPLAY");
  });

  it("refuses to newly choose Auction, but keeps it on a piece that has it", () => {
    const choose = parseArtworkForm(form({ title: "A", priceMode: "AUCTION", amount: "100" }), existing, 0);
    expect(choose).toEqual({ ok: false, errors: { priceMode: "auctionUnavailable" } });

    const keep = parseArtworkForm(
      form({ title: "A", priceMode: "AUCTION", amount: "100" }),
      { ...existing, priceMode: "AUCTION" },
      0,
    );
    expect(keep.ok).toBe(true);
  });

  it("needs an image before publishing, but allows image-less drafts", () => {
    const published = parseArtworkForm(form({ title: "A", amount: "1", published: "on", images: "[]" }), null, 0);
    expect(published).toEqual({ ok: false, errors: { images: "imagesRequired" } });
    const draft = parseArtworkForm(form({ title: "A", amount: "1", images: "[]" }), null, 0);
    expect(draft.ok).toBe(true);
  });

  it("rejects bad slugs and tampered image data", () => {
    const result = parseArtworkForm(
      form({ title: "A", slug: "Not A Slug", amount: "1", images: "not json" }),
      null,
      0,
    );
    expect(result).toEqual({ ok: false, errors: { slug: "invalidSlug", images: "invalidImages" } });
  });

  it("keeps the existing sort order and currency when editing", () => {
    const result = parseArtworkForm(
      form({ title: "Low Tide", slug: "low-tide", amount: "1450", images: image }),
      { ...existing, currency: "USD" },
      -5,
    );
    expect(result.ok && result.input.sortOrder).toBe(3);
    expect(result.ok && result.input.currency).toBe("USD");
  });
});
