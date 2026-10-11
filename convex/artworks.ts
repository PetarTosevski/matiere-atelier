import { ConvexError, v } from "convex/values";
import type { Doc, Id } from "./_generated/dataModel";
import type { MutationCtx, QueryCtx } from "./_generated/server";
import { serverMutation, serverQuery } from "./guard";
import { deleteFilesIfPresent } from "./storage";
import { statusValidator, writableArtworkFields as writableFields } from "./schema";

// Raw artwork data for the Next.js server. Pricing and display rules are NOT
// applied here; lib/pricing.ts does that. These functions are only reachable
// with the server secret (see guard.ts).

export type StoredArtwork = Awaited<ReturnType<typeof toArtwork>>;

async function toArtwork(ctx: QueryCtx, doc: Doc<"artworks">) {
  const images = await Promise.all(
    doc.images.map(async (image) => ({
      ...image,
      src: await ctx.storage.getUrl(image.storageId),
    })),
  );
  return {
    id: doc._id as string,
    slug: doc.slug,
    title: doc.title,
    description: doc.description,
    priceMode: doc.priceMode,
    priceAmount: doc.priceAmount,
    currency: doc.currency,
    status: doc.status,
    published: doc.published,
    sortOrder: doc.sortOrder,
    dimensions: doc.dimensions ?? null,
    images: images.flatMap(({ src, ...image }) => (src ? [{ ...image, src }] : [])),
    createdAt: doc.createdAt,
  };
}

/** Published artworks, unsorted (lib/artworks.ts orders them). */
export const listPublished = serverQuery({
  args: {},
  handler: async (ctx) => {
    const docs = await ctx.db
      .query("artworks")
      .withIndex("by_published", (q) => q.eq("published", true))
      .collect();
    return Promise.all(docs.map((doc) => toArtwork(ctx, doc)));
  },
});

/** Every artwork, drafts included, for the admin list. */
export const listAll = serverQuery({
  args: {},
  handler: async (ctx) => {
    const docs = await ctx.db.query("artworks").collect();
    return Promise.all(docs.map((doc) => toArtwork(ctx, doc)));
  },
});

/** A published artwork by slug; null for drafts and unknown slugs. */
export const getPublishedBySlug = serverQuery({
  args: { slug: v.string() },
  handler: async (ctx, { slug }) => {
    const doc = await ctx.db
      .query("artworks")
      .withIndex("by_slug", (q) => q.eq("slug", slug))
      .unique();
    return doc && doc.published ? toArtwork(ctx, doc) : null;
  },
});

/** Any artwork by slug, drafts included (admin and seeding). */
export const getAnyBySlug = serverQuery({
  args: { slug: v.string() },
  handler: async (ctx, { slug }) => {
    const doc = await ctx.db
      .query("artworks")
      .withIndex("by_slug", (q) => q.eq("slug", slug))
      .unique();
    return doc ? toArtwork(ctx, doc) : null;
  },
});

/** One artwork by ID, drafts included (admin edit form). */
export const getById = serverQuery({
  args: { id: v.string() },
  handler: async (ctx, { id: raw }) => {
    const id = ctx.db.normalizeId("artworks", raw);
    const doc = id ? await ctx.db.get(id) : null;
    return doc ? toArtwork(ctx, doc) : null;
  },
});

/** Artworks by ID, drafts included; unknown or malformed IDs are skipped. */
export const getByIds = serverQuery({
  args: { ids: v.array(v.string()) },
  handler: async (ctx, { ids }) => {
    const found = await Promise.all(
      ids.slice(0, 100).map(async (raw) => {
        const id = ctx.db.normalizeId("artworks", raw);
        return id ? ctx.db.get(id) : null;
      }),
    );
    return Promise.all(
      found.filter((doc): doc is Doc<"artworks"> => doc !== null).map((doc) => toArtwork(ctx, doc)),
    );
  },
});

// ---- Writes (admin) ----

type WritableArtwork = Omit<Doc<"artworks">, "_id" | "_creationTime" | "createdAt">;

function assertValid(artwork: WritableArtwork) {
  const problems: string[] = [];
  if (!artwork.title.trim()) problems.push("title is required");
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(artwork.slug)) problems.push("slug must be lowercase words joined by hyphens");
  if (!/^[A-Z]{3}$/.test(artwork.currency)) problems.push("currency must be an ISO 4217 code");
  if (artwork.priceAmount !== null && (!Number.isSafeInteger(artwork.priceAmount) || artwork.priceAmount < 0)) {
    problems.push("priceAmount must be a non-negative integer of minor units");
  }
  if (artwork.priceMode === "PRICE" && artwork.priceAmount === null) problems.push("PRICE mode needs an amount");
  if (artwork.published && artwork.images.length === 0) problems.push("a published artwork needs at least one image");
  const size = artwork.dimensions;
  if (size && ![size.width, size.height].every((n) => Number.isFinite(n) && n > 0 && n <= 2000)) {
    problems.push("dimensions must be positive centimetres up to 2000");
  }
  if (problems.length > 0) throw new ConvexError(problems.join("; "));
}

async function assertSlugFree(ctx: MutationCtx, slug: string, except?: Id<"artworks">) {
  const existing = await ctx.db
    .query("artworks")
    .withIndex("by_slug", (q) => q.eq("slug", slug))
    .unique();
  if (existing && existing._id !== except) throw new ConvexError(`slug "${slug}" is already used`);
}

/** Deletes stored files that the artwork no longer references. */
async function deleteFiles(ctx: MutationCtx, storageIds: Id<"_storage">[]) {
  await deleteFilesIfPresent(ctx, storageIds);
}

export const create = serverMutation({
  args: { ...writableFields, createdAt: v.optional(v.string()) },
  handler: async (ctx, { createdAt, ...artwork }) => {
    assertValid(artwork);
    await assertSlugFree(ctx, artwork.slug);
    return ctx.db.insert("artworks", {
      ...artwork,
      createdAt: createdAt ?? new Date().toISOString(),
    });
  },
});

export const update = serverMutation({
  args: { id: v.id("artworks"), ...writableFields },
  handler: async (ctx, { id, ...artwork }) => {
    const current = await ctx.db.get(id);
    if (!current) throw new ConvexError("artwork not found");
    assertValid(artwork);
    if (artwork.slug !== current.slug) await assertSlugFree(ctx, artwork.slug, id);

    const kept = new Set(artwork.images.map((image) => image.storageId));
    await ctx.db.patch(id, artwork);
    await deleteFiles(ctx, current.images.map((image) => image.storageId).filter((sid) => !kept.has(sid)));
    return { previousSlug: current.slug };
  },
});

export const setStatus = serverMutation({
  args: { id: v.id("artworks"), status: statusValidator },
  handler: async (ctx, { id, status }) => {
    const current = await ctx.db.get(id);
    if (!current) throw new ConvexError("artwork not found");
    await ctx.db.patch(id, { status });
    return { slug: current.slug };
  },
});

/** Sets sortOrder from the given order (the Originals layout). */
export const reorder = serverMutation({
  args: { ids: v.array(v.id("artworks")) },
  handler: async (ctx, { ids }) => {
    await Promise.all(ids.map((id, index) => ctx.db.patch(id, { sortOrder: index + 1 })));
  },
});

/** Deletes the artwork and its image files. */
export const remove = serverMutation({
  args: { id: v.id("artworks") },
  handler: async (ctx, { id }) => {
    const current = await ctx.db.get(id);
    if (!current) return null;
    await ctx.db.delete(id);
    await deleteFiles(ctx, current.images.map((image) => image.storageId));
    return { slug: current.slug };
  },
});
