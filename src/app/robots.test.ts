import { afterEach, describe, expect, it, vi } from "vitest";
import robots from "@/app/robots";

describe("robots.txt", () => {
  afterEach(() => vi.unstubAllEnvs());

  it("keeps every crawler out until launch", () => {
    vi.stubEnv("ALLOW_INDEXING", "");
    expect(robots()).toEqual({ rules: { userAgent: "*", disallow: "/" } });
  });

  it("opens the site and points to the sitemap once ALLOW_INDEXING is true", () => {
    vi.stubEnv("ALLOW_INDEXING", "true");
    vi.stubEnv("NEXT_PUBLIC_SITE_URL", "https://www.example.com");
    expect(robots()).toEqual({
      rules: { userAgent: "*", allow: "/" },
      sitemap: "https://www.example.com/sitemap.xml",
    });
  });

  it("never names the admin area", () => {
    vi.stubEnv("ALLOW_INDEXING", "true");
    expect(JSON.stringify(robots())).not.toContain("admin");
  });
});
