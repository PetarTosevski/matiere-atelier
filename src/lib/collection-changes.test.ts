import { describe, expect, it } from "vitest";
import type { AdminArtwork } from "@/lib/artworks";
import { parseCollectionChanges, toChanges, toEditorWork, type EditorWork } from "@/lib/collection-changes";

const saved = (id: string, slug: string, sortOrder: number, extra: Partial<AdminArtwork> = {}): AdminArtwork => ({
  id,
  slug,
  title: slug,
  description: "",
  priceMode: "PRICE",
  priceAmount: 100000,
  currency: "EUR",
  status: "AVAILABLE",
  published: true,
  sortOrder,
  dimensions: null,
  images: [{ storageId: `s-${id}`, src: `https://x/${id}`, width: 10, height: 10, alt: slug }],
  createdAt: "2026-01-01T00:00:00.000Z",
  ...extra,
});

const a = saved("a", "low-tide", 1);
const b = saved("b", "harbour-wall", 2);

const newWork = (patch: Partial<EditorWork> = {}): EditorWork => ({
  key: "new-1",
  id: null,
  title: "Field notes",
  slug: "",
  description: "",
  priceMode: "PRICE",
  amount: "",
  status: "AVAILABLE",
  published: false,
  width: "",
  height: "",
  images: [{ storageId: "s-new", src: "https://x/new", width: 10, height: 10, alt: "" }],
  ...patch,
});

const request = (currency: string, works: EditorWork[]) => toChanges(currency, true, works);

describe("parseCollectionChanges", () => {
  it("carries the Show prices switch", () => {
    const result = parseCollectionChanges(toChanges("EUR", false, [toEditorWork(a)]), [a]);
    expect(result).toMatchObject({ ok: true, showPrices: false });
    expect(parseCollectionChanges({ ...request("EUR", [toEditorWork(a)]), showPrices: "no" }, [a]).ok).toBe(false);
  });

  it("takes the order on the page as the Originals order", () => {
    const result = parseCollectionChanges(request("EUR", [toEditorWork(b), toEditorWork(a)]), [a, b]);
    expect(result.ok && result.artworks.map((x) => [x.id, x.sortOrder])).toEqual([
      ["b", 1],
      ["a", 2],
    ]);
  });

  it("adds a new piece as a draft that may wait for its price", () => {
    const result = parseCollectionChanges(request("EUR", [toEditorWork(a), newWork()]), [a]);
    expect(result.ok).toBe(true);
    const added = result.ok ? result.artworks[1]! : null;
    expect(added).toMatchObject({ id: null, slug: "field-notes", priceAmount: null, published: false, sortOrder: 2 });
  });

  it("puts every piece in the shop currency without converting amounts", () => {
    const result = parseCollectionChanges(request("USD", [toEditorWork(a), toEditorWork(b)]), [a, b]);
    expect(result.ok && result.currency).toBe("USD");
    expect(result.ok && result.artworks.map((x) => [x.currency, x.priceAmount])).toEqual([
      ["USD", 100000],
      ["USD", 100000],
    ]);
  });

  it("refuses a currency the shop doesn't offer", () => {
    for (const currency of ["JPY", "eur", "XYZ"]) {
      expect(parseCollectionChanges(request(currency, [toEditorWork(a)]), [a])).toMatchObject({ ok: false });
    }
  });

  it("marks the piece whose web address is already taken", () => {
    const clash = newWork({ title: "Low tide" });
    const result = parseCollectionChanges(request("EUR", [toEditorWork(a), clash]), [a]);
    expect(result).toEqual({ ok: false, errors: { "new-1": { slug: "slugTaken" } } });
  });

  it("lets two pieces swap web addresses", () => {
    const swapped = [
      { ...toEditorWork(a), slug: "harbour-wall" },
      { ...toEditorWork(b), slug: "low-tide" },
    ];
    expect(parseCollectionChanges(request("EUR", swapped), [a, b]).ok).toBe(true);
  });

  it("reports field errors per piece", () => {
    const result = parseCollectionChanges(
      request("EUR", [{ ...toEditorWork(a), amount: "12.345" }, newWork({ title: "" , published: true })]),
      [a],
    );
    expect(result.ok).toBe(false);
    expect(!result.ok && result.errors.a).toEqual({ amount: "invalidAmount" });
    expect(!result.ok && result.errors["new-1"]?.title).toBe("required");
  });

  it("keeps saved pieces the request left out, after the others", () => {
    const result = parseCollectionChanges(request("EUR", [toEditorWork(b)]), [a, b]);
    expect(result.ok && result.artworks.map((x) => [x.id, x.sortOrder])).toEqual([
      ["b", 1],
      ["a", 2],
    ]);
    // Only the fields Convex accepts.
    expect(result.ok && Object.keys(result.artworks[1]!)).not.toContain("createdAt");
  });

  it("rejects malformed requests and unknown or repeated ids", () => {
    expect(parseCollectionChanges({ currency: "EUR" }, [a])).toEqual({ ok: false, errors: {} });
    expect(parseCollectionChanges(request("EUR", [{ ...toEditorWork(a), id: "zzz" }]), [a]).ok).toBe(false);
    expect(
      parseCollectionChanges(request("EUR", [toEditorWork(a), { ...toEditorWork(a), key: "other" }]), [a]).ok,
    ).toBe(false);
  });
});
