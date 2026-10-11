import { describe, expect, it } from "vitest";
import { MAX_BIO_LENGTH, parseAboutForm } from "@/lib/about-form";

function form(fields: Record<string, string>) {
  const data = new FormData();
  for (const [key, value] of Object.entries(fields)) data.append(key, value);
  return data;
}

const portrait = (alt: string) =>
  JSON.stringify({ storageId: "s1", width: 800, height: 1000, alt });

describe("parseAboutForm", () => {
  it("accepts a bio and a described portrait", () => {
    expect(parseAboutForm(form({ bio: "**Sara** paints.", portrait: portrait("Sara in her studio") }))).toEqual({
      ok: true,
      input: {
        bio: "**Sara** paints.",
        portrait: { storageId: "s1", width: 800, height: 1000, alt: "Sara in her studio" },
      },
    });
  });

  it("allows no portrait and an empty bio (the page then shows its placeholders)", () => {
    expect(parseAboutForm(form({ bio: "", portrait: "null" }))).toEqual({
      ok: true,
      input: { bio: "", portrait: null },
    });
  });

  it("stores browser line breaks (CRLF) as plain LF", () => {
    const result = parseAboutForm(form({ bio: "One\r\n\r\nTwo\rThree", portrait: "null" }));
    expect(result.ok && result.input.bio).toBe("One\n\nTwo\nThree");
  });

  it("requires alt text for a portrait", () => {
    expect(parseAboutForm(form({ bio: "", portrait: portrait("  ") }))).toEqual({
      ok: false,
      errors: { portrait: "altRequired" },
    });
  });

  it("rejects an overly long bio and tampered portrait data", () => {
    expect(parseAboutForm(form({ bio: "x".repeat(MAX_BIO_LENGTH + 1), portrait: "{not json" }))).toEqual({
      ok: false,
      errors: { bio: "tooLong", portrait: "invalidPortrait" },
    });
  });
});
