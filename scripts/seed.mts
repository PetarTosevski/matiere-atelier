// npm run db:seed [-- --reset]
// Imports the Phase 1 artworks (src/data/artworks.ts) and settings into Convex,
// uploading each placeholder image to Convex file storage. Existing artworks
// are matched by slug and skipped, so it is safe to run again. --reset deletes
// every artwork (and its files) first.
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { ConvexHttpClient } from "convex/browser";
import { api } from "../convex/_generated/api.js";
import { artworks } from "../src/data/artworks.ts";
import { siteSettings } from "../src/data/settings.ts";

for (const file of [".env.local", ".env"]) {
  if (existsSync(file)) process.loadEnvFile(file);
}

const url = process.env.CONVEX_URL || process.env.NEXT_PUBLIC_CONVEX_URL;
if (!url || !process.env.CONVEX_SERVER_SECRET) {
  console.error("Set CONVEX_URL (or run npx convex dev) and CONVEX_SERVER_SECRET first.");
  process.exit(1);
}
const secret: string = process.env.CONVEX_SERVER_SECRET;

const client = new ConvexHttpClient(url);
const reset = process.argv.includes("--reset");

async function uploadImage(src: string): Promise<string> {
  const file = path.join(process.cwd(), "public", src);
  const uploadUrl = await client.mutation(api.files.generateUploadUrl, { secret });
  const response = await fetch(uploadUrl, {
    method: "POST",
    headers: { "Content-Type": "image/webp" },
    body: readFileSync(file),
  });
  if (!response.ok) throw new Error(`Upload of ${src} failed: ${response.status}`);
  const { storageId } = (await response.json()) as { storageId: string };
  return storageId;
}

if (reset) {
  const existing = await client.query(api.artworks.listAll, { secret });
  for (const artwork of existing) {
    await client.mutation(api.artworks.remove, { secret, id: artwork.id as never });
  }
  console.log(`Removed ${existing.length} artworks.`);
}

let created = 0;
let skipped = 0;

for (const artwork of artworks) {
  const existing = await client.query(api.artworks.getAnyBySlug, { secret, slug: artwork.slug });
  if (existing) {
    skipped++;
    continue;
  }

  const images = [];
  for (const image of artwork.images) {
    images.push({
      storageId: (await uploadImage(image.src)) as never,
      width: image.width,
      height: image.height,
      alt: image.alt,
    });
  }

  await client.mutation(api.artworks.create, {
    secret,
    slug: artwork.slug,
    title: artwork.title,
    description: artwork.description,
    priceMode: artwork.priceMode,
    priceAmount: artwork.priceAmount,
    currency: artwork.currency,
    status: artwork.status,
    published: artwork.published,
    sortOrder: artwork.sortOrder,
    images,
    createdAt: artwork.createdAt,
  });
  created++;
  console.log(`Imported ${artwork.slug} (${images.length} image${images.length === 1 ? "" : "s"})`);
}

await client.mutation(api.settings.setShowPrices, { secret, showPrices: siteSettings.showPrices });
console.log(`Done: ${created} imported, ${skipped} already there. showPrices = ${siteSettings.showPrices}.`);
