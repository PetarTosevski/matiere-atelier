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

/** One piece of an order, as it was when the order was sent. */
export const orderItemValidator = v.object({
  artworkId: v.string(),
  title: v.string(),
  slug: v.string(),
  /** Integer minor units (cents). */
  amount: v.number(),
  currency: v.string(),
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
  artworks: defineTable({
    ...artworkFields,
    /**
     * When subscribers were emailed about the piece (the first time it went on
     * the site). Pieces already on the site when this was added get it on the
     * next publish, without an email.
     */
    announcedAt: v.optional(v.number()),
  })
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
    /** Counts up per type (REQUEST #1, #2, ...) for the email subject. Older rows have none. */
    number: v.optional(v.number()),
    /** Whether the email to the artist went out. */
    emailed: v.boolean(),
    /** The signed-in customer who sent it, if any. */
    customerId: v.optional(v.id("customers")),
    /** ORDER only: the pieces as they were when the order was sent. */
    items: v.optional(v.array(orderItemValidator)),
  })
    .index("by_customer", ["customerId"])
    .index("by_type_number", ["type", "number"]),

  /** Collector accounts. Passwords are bcrypt hashes made in Next.js. */
  customers: defineTable({
    /** Lowercased. */
    email: v.string(),
    firstName: v.string(),
    lastName: v.string(),
    passwordHash: v.string(),
    newsletter: v.boolean(),
    /** Bumped when the password changes, which signs out other sessions. */
    sessionVersion: v.number(),
    /**
     * Set once the owner opened a link sent to the address (verification or
     * password reset). Accounts can't sign in before. Missing on accounts made
     * before verification existed (2026-10-13): they count as unconfirmed.
     */
    emailVerified: v.optional(v.boolean()),
    /** ISO 8601. */
    createdAt: v.string(),
  }).index("by_email", ["email"]),

  /**
   * One-time links sent by email: password resets and email verification.
   * Only a SHA-256 of the token is stored. subject: "admin", "customer:<id>"
   * (reset) or "verify:<id>" (confirm a new account's email).
   */
  passwordResets: defineTable({
    tokenHash: v.string(),
    subject: v.string(),
    expiresAt: v.number(),
    /** Sign-in codes ("admin-code") only: wrong guesses so far. */
    attempts: v.optional(v.number()),
  })
    .index("by_token", ["tokenHash"])
    .index("by_subject", ["subject"]),

  /**
   * A single document: the admin password once it has been reset from the
   * site. Until then ADMIN_PASSWORD_HASH in the environment is used.
   */
  adminCredentials: defineTable({
    passwordHash: v.string(),
    sessionVersion: v.number(),
  }),

  /** Recent attempt timestamps per key, for forms and login. */
  rateLimits: defineTable({
    key: v.string(),
    hits: v.array(v.number()),
  }).index("by_key", ["key"]),
});
