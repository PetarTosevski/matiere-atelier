import { describe, expect, it } from "vitest";
import { excerpt, markdownToPlainText } from "@/lib/markdown";

describe("markdownToPlainText", () => {
  it("strips emphasis, links, list markers and raw HTML", () => {
    const markdown = [
      "**Size:** 61 x 51 cm",
      "**Medium:** acrylic and *texture paste* on linen canvas",
      "",
      "- Signed on the [back](https://example.com)",
      "<script>alert(1)</script>Ready to hang",
    ].join("\n");

    expect(markdownToPlainText(markdown)).toBe(
      "Size: 61 x 51 cm Medium: acrylic and texture paste on linen canvas Signed on the back alert(1) Ready to hang",
    );
  });
});

describe("excerpt", () => {
  it("returns short text unchanged", () => {
    expect(excerpt("A short line.", 160)).toBe("A short line.");
  });

  it("cuts long text at a word boundary and adds an ellipsis", () => {
    const text = "one two three four five six seven eight nine ten";
    const result = excerpt(text, 20);
    expect(result).toBe("one two three four…");
    expect(result.length).toBeLessThanOrEqual(20);
  });
});
