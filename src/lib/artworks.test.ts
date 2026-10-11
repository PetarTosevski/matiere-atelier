import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, expectTypeOf, it } from "vitest";
import { z } from "zod";
import { artworks } from "@/data/artworks";
import {
  compareArtworks,
  getArtworkBySlug,
  getPublishedArtworks,
  getPublishedSlugs,
} from "@/lib/artworks";
import type { Artwork } from "@/lib/types";

const artworkSchema = z.strictObject({
  id: z.string().min(1),
  slug: z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
  title: z.string().trim().min(1),
  description: z.string(),
  priceMode: z.enum(["PRICE", "AUCTION", "DISPLAY"]),
  priceAmount: z.number().int().nonnegative().nullable(),
  currency: z.string().regex(/^[A-Z]{3}$/),
  status: z.enum(["AVAILABLE", "SOLD"]),
  published: z.boolean(),
  sortOrder: z.number().int(),
  images: z
    .array(
      z.strictObject({
        src: z.string().startsWith("/"),
        width: z.number().int().positive(),
        height: z.number().int().positive(),
        alt: z.string().trim().min(1),
      }),
    )
    .min(1),
  createdAt: z.iso.datetime(),
});

/** Reads the pixel size from a WebP file header (VP8, VP8L or VP8X). */
function webpSize(file: string): { width: number; height: number } {
  const data = readFileSync(file);
  if (data.toString("ascii", 0, 4) !== "RIFF" || data.toString("ascii", 8, 12) !== "WEBP") {
    throw new Error(`${file} is not a WebP file`);
  }
  const chunk = data.toString("ascii", 12, 16);
  if (chunk === "VP8X") {
    return { width: data.readUIntLE(24, 3) + 1, height: data.readUIntLE(27, 3) + 1 };
  }
  if (chunk === "VP8L") {
    const bits = data.readUInt32LE(21);
    return { width: (bits & 0x3fff) + 1, height: ((bits >> 14) & 0x3fff) + 1 };
  }
  if (chunk === "VP8 ") {
    return { width: data.readUInt16LE(26) & 0x3fff, height: data.readUInt16LE(28) & 0x3fff };
  }
  throw new Error(`${file} has an unknown WebP chunk ${chunk}`);
}

describe("placeholder data", () => {
  it("matches the Artwork type and schema", () => {
    expectTypeOf<z.infer<typeof artworkSchema>>().toEqualTypeOf<Artwork>();
    for (const artwork of artworks) {
      expect(() => artworkSchema.parse(artwork), artwork.slug).not.toThrow();
    }
  });

  it("has unique ids and slugs", () => {
    expect(new Set(artworks.map((a) => a.id)).size).toBe(artworks.length);
    expect(new Set(artworks.map((a) => a.slug)).size).toBe(artworks.length);
  });

  it("gives every PRICE piece an amount", () => {
    for (const artwork of artworks.filter((a) => a.priceMode === "PRICE")) {
      expect(artwork.priceAmount, artwork.slug).not.toBeNull();
    }
  });

  it("covers every row of the price table", () => {
    const has = (match: (a: Artwork) => boolean) => artworks.some(match);
    expect(has((a) => a.published && a.priceMode === "PRICE" && a.status === "AVAILABLE")).toBe(true);
    expect(has((a) => a.published && a.priceMode === "PRICE" && a.status === "SOLD")).toBe(true);
    expect(has((a) => a.published && a.priceMode === "DISPLAY")).toBe(true);
    expect(has((a) => a.published && a.priceMode === "AUCTION")).toBe(true);
    expect(has((a) => !a.published)).toBe(true);
    expect(artworks.some((a) => a.images.length > 1)).toBe(true);
  });

  it("mixes portrait, landscape and square covers", () => {
    const ratios = artworks
      .filter((a) => a.published)
      .map((a) => a.images[0]!)
      .map((image) => image.width / image.height);
    expect(ratios.some((r) => r < 1)).toBe(true);
    expect(ratios.some((r) => r > 1)).toBe(true);
    expect(ratios.some((r) => r === 1)).toBe(true);
  });

  it("points every image at a file whose size matches the data", () => {
    for (const image of artworks.flatMap((a) => a.images)) {
      const file = path.join(process.cwd(), "public", image.src);
      expect(webpSize(file), image.src).toEqual({
        width: image.width,
        height: image.height,
      });
    }
  });
});

describe("lib/artworks", () => {
  it("never returns unpublished drafts", async () => {
    const published = await getPublishedArtworks();
    expect(published.length).toBe(artworks.filter((a) => a.published).length);
    expect(published.every((a) => a.published)).toBe(true);
    expect(await getPublishedSlugs()).not.toContain("untitled-draft");
    expect(await getArtworkBySlug("untitled-draft")).toBeNull();
  });

  it("returns null for unknown slugs", async () => {
    expect(await getArtworkBySlug("does-not-exist")).toBeNull();
  });

  it("finds a published piece by slug", async () => {
    expect((await getArtworkBySlug("low-tide"))?.title).toBe("Low Tide");
  });

  it("orders by sortOrder, then newest first", async () => {
    const slugs = (await getPublishedArtworks()).map((a) => a.slug);
    expect(slugs).toEqual([
      "low-tide",
      "harbour-wall",
      "field-notes-i",
      "tall-grass",
      "quiet-orchard",
      // Both have sortOrder 6; the newer one comes first.
      "weather-front",
      "study-in-umber",
    ]);
  });

  it("breaks sortOrder ties by createdAt, newest first", () => {
    const base = artworks[0]!;
    const older = { ...base, sortOrder: 1, createdAt: "2026-01-01T00:00:00.000Z" };
    const newer = { ...base, sortOrder: 1, createdAt: "2026-02-01T00:00:00.000Z" };
    const first = { ...base, sortOrder: 0, createdAt: "2025-01-01T00:00:00.000Z" };
    expect([older, newer, first].sort(compareArtworks)).toEqual([first, newer, older]);
  });

  it("does not reorder the source data", async () => {
    const before = artworks.map((a) => a.id);
    await getPublishedArtworks();
    expect(artworks.map((a) => a.id)).toEqual(before);
  });
});
