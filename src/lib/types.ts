// Data model shared by both phases. Phase 2 swaps the storage, not the shape.

export type PriceMode = "PRICE" | "AUCTION" | "DISPLAY";
export type Status = "AVAILABLE" | "SOLD";

export type ArtworkImage = {
  src: string;
  width: number;
  height: number;
  alt: string;
};

/**
 * Physical size in centimetres, width first ("80 × 100 cm"). Decimals are
 * allowed (61.5); these are measurements, not money. Depth and inches can be
 * added later without changing existing data.
 */
export type Dimensions = { width: number; height: number };

export type Artwork = {
  id: string;
  /** Unique, generated from the title, editable. */
  slug: string;
  title: string;
  /** Markdown. */
  description: string;
  priceMode: PriceMode;
  /** Integer minor units (cents). Kept when priceMode changes. */
  priceAmount: number | null;
  /** ISO 4217 code. */
  currency: string;
  status: Status;
  /** Drafts never appear on the storefront. */
  published: boolean;
  /** Order on Originals (ascending). */
  sortOrder: number;
  /** Null when not entered. */
  dimensions: Dimensions | null;
  /** The first image is the cover; the second shows on hover in the grid. */
  images: ArtworkImage[];
  /** ISO 8601 timestamp. */
  createdAt: string;
};

export type Theme = "dark" | "light";

export type SiteSettings = {
  showPrices: boolean;
  /** The shop currency (ISO 4217), shared by every artwork. */
  currency: string;
  /** The default theme for every visitor; each visitor can switch. */
  theme: Theme;
};

export type InquiryType = "CONTACT" | "COMMISSION" | "REQUEST" | "ORDER";
