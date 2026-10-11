// Data model shared by both phases. Phase 2 swaps the storage, not the shape.

export type PriceMode = "PRICE" | "AUCTION" | "DISPLAY";
export type Status = "AVAILABLE" | "SOLD";

export type ArtworkImage = {
  src: string;
  width: number;
  height: number;
  alt: string;
};

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
  /** The first image is the cover. */
  images: ArtworkImage[];
  /** ISO 8601 timestamp. */
  createdAt: string;
};

export type SiteSettings = { showPrices: boolean };

export type InquiryType = "CONTACT" | "COMMISSION" | "REQUEST" | "ORDER";
