import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

// The Artwork shape from CLAUDE.md, stored in Convex. Images point at Convex
// file storage; their public URL is resolved when artworks are read.

export const priceModeValidator = v.union(
  v.literal("PRICE"),
  v.literal("AUCTION"),
  v.literal("DISPLAY"),
);

export const statusValidator = v.union(v.literal("AVAILABLE"), v.literal("SOLD"));

export const inquiryTypeValidator = v.union(
  v.literal("CONTACT"),
  v.literal("COMMISSION"),
  v.literal("REQUEST"),
  v.literal("ORDER"),
);

export const storedImageValidator = v.object({
  storageId: v.id("_storage"),
  width: v.number(),
  height: v.number(),
  alt: v.string(),
});

/** Width and height in centimetres (decimals allowed). */
export const dimensionsValidator = v.object({ width: v.number(), height: v.number() });

/** Everything an admin edits; createdAt is set once on creation. */
export const writableArtworkFields = {
  slug: v.string(),
  title: v.string(),
  /** Markdown. */
  description: v.string(),
  priceMode: priceModeValidator,
  /** Integer minor units (cents). Kept when priceMode changes. */
  priceAmount: v.union(v.number(), v.null()),
  /** ISO 4217. */
  currency: v.string(),
  status: statusValidator,
  published: v.boolean(),
  sortOrder: v.number(),
  /** Optional so artworks saved before this field existed stay valid. */
  dimensions: v.optional(v.union(dimensionsValidator, v.null())),
  /** The first image is the cover; the second shows on hover in the grid. */
  images: v.array(storedImageValidator),
};

export const artworkFields = {
  ...writableArtworkFields,
  /** ISO 8601. */
  createdAt: v.string(),
};

export default defineSchema({
  artworks: defineTable(artworkFields)
    .index("by_slug", ["slug"])
    .index("by_published", ["published"]),

  /** A single document with the About page content the artist edits. */
  aboutPage: defineTable({
    /** Markdown. */
    bio: v.string(),
    portrait: v.union(storedImageValidator, v.null()),
  }),

  /** A single document holding the site-wide settings. */
  siteSettings: defineTable({
    showPrices: v.boolean(),
    /** The shop currency; optional so the document saved before it existed stays valid. */
    currency: v.optional(v.string()),
    /** The default theme, "dark" or "light"; optional for the same reason. */
    theme: v.optional(v.union(v.literal("dark"), v.literal("light"))),
  }),

  inquiries: defineTable({
    type: inquiryTypeValidator,
    name: v.string(),
    email: v.string(),
    /** The rest of the form, as submitted (validated in Next.js). */
    details: v.record(v.string(), v.union(v.string(), v.array(v.string()))),
    /** Whether the email to the artist went out. */
    emailed: v.boolean(),
  }),

  /** Recent attempt timestamps per key, for forms and login. */
  rateLimits: defineTable({
    key: v.string(),
    hits: v.array(v.number()),
  }).index("by_key", ["key"]),
});
