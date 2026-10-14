import { afterEach, describe, expect, it, vi } from "vitest";
import sitemap from "@/app/sitemap";
import { artworks } from "@/data/artworks";

// Without Convex configured, tests read the static artworks in src/data.
describe("sitemap.xml", () => {
  afterEach(() => vi.unstubAllEnvs());

  it("lists nothing while the site is locked", async () => {
    vi.stubEnv("SITE_LOCKED", "true");
    expect(await sitemap()).toEqual([]);
  });

  it("lists the public pages and published artworks only", async () => {
    const urls = (await sitemap()).map((entry) => entry.url);
    expect(urls).toContain("http://localhost:3000/en/originals");
    expect(urls).toContain("http://localhost:3000/en/contact");
    for (const artwork of artworks) {
      expect(urls.includes(`http://localhost:3000/en/originals/${artwork.slug}`)).toBe(artwork.published);
    }
    expect(urls.some((url) => url.includes("admin") || url.includes("account") || url.includes("cart"))).toBe(false);
  });
});
