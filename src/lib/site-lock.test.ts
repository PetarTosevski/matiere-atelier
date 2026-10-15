import { afterEach, describe, expect, it, vi } from "vitest";
import { hasPreviewAccess, isPreviewToken, isSiteLocked, previewCookieValue } from "@/lib/site-lock";

const SECRET = "x".repeat(32);

describe("site lock", () => {
  afterEach(() => vi.unstubAllEnvs());

  it("is locked only when SITE_LOCKED is true, in any letter case", () => {
    vi.stubEnv("SITE_LOCKED", "");
    expect(isSiteLocked()).toBe(false);
    vi.stubEnv("SITE_LOCKED", "1");
    expect(isSiteLocked()).toBe(false);
    vi.stubEnv("SITE_LOCKED", "true");
    expect(isSiteLocked()).toBe(true);
    vi.stubEnv("SITE_LOCKED", " TRUE ");
    expect(isSiteLocked()).toBe(true);
  });

  it("accepts only the configured preview token", () => {
    vi.stubEnv("SITE_PREVIEW_TOKEN", "");
    expect(isPreviewToken("")).toBe(false);
    expect(isPreviewToken("anything")).toBe(false);
    vi.stubEnv("SITE_PREVIEW_TOKEN", "open-sesame");
    expect(isPreviewToken("open-sesame")).toBe(true);
    expect(isPreviewToken("open-sesam")).toBe(false);
    expect(isPreviewToken(null)).toBe(false);
  });

  it("lets in the cookie it made, and nothing else", async () => {
    vi.stubEnv("SESSION_SECRET", SECRET);
    vi.stubEnv("SITE_PREVIEW_TOKEN", "open-sesame");
    const value = await previewCookieValue();
    expect(value).toMatch(/^[0-9a-f]{64}$/);
    expect(value).not.toContain("open-sesame");
    expect(await hasPreviewAccess(value!)).toBe(true);
    expect(await hasPreviewAccess(undefined)).toBe(false);
    expect(await hasPreviewAccess("open-sesame")).toBe(false);
  });

  it("revokes old cookies when the token changes", async () => {
    vi.stubEnv("SESSION_SECRET", SECRET);
    vi.stubEnv("SITE_PREVIEW_TOKEN", "first");
    const old = await previewCookieValue();
    vi.stubEnv("SITE_PREVIEW_TOKEN", "second");
    expect(await hasPreviewAccess(old!)).toBe(false);
  });

  it("gives no access without SESSION_SECRET", async () => {
    vi.stubEnv("SESSION_SECRET", "");
    expect(await previewCookieValue()).toBeNull();
    expect(await hasPreviewAccess("anything")).toBe(false);
  });
});
