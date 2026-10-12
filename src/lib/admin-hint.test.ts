import { describe, expect, it } from "vitest";
import { adminEditTarget } from "./admin-hint";

describe("adminEditTarget", () => {
  it("opens the piece from its artwork and request pages", () => {
    expect(adminEditTarget("/originals/first-tracks")).toEqual({ kind: "piece", href: "/admin?edit=first-tracks" });
    expect(adminEditTarget("/request/first-tracks")).toEqual({ kind: "piece", href: "/admin?edit=first-tracks" });
  });

  it("keeps encoded slugs encoded once", () => {
    expect(adminEditTarget("/originals/caf%C3%A9")).toEqual({ kind: "piece", href: "/admin?edit=caf%C3%A9" });
  });

  it("opens the About editor from About", () => {
    expect(adminEditTarget("/about")).toEqual({ kind: "about", href: "/admin/about" });
  });

  it("opens the collection from every other page", () => {
    for (const path of ["/originals", "/", "/contact", "/cart", "/originals/a/b"]) {
      expect(adminEditTarget(path)).toEqual({ kind: "collection", href: "/admin" });
    }
  });
});
