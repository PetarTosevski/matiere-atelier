import { describe, expect, it } from "vitest";
import { readInquiryForm, validateInquiry } from "@/lib/inquiry";

function form(entries: [string, string][]) {
  const data = new FormData();
  for (const [key, value] of entries) data.append(key, value);
  return data;
}

const contact = { name: "Ana", email: "ana@example.com", message: "Hello" };

describe("validateInquiry", () => {
  it("accepts a complete contact message and trims it", () => {
    const result = validateInquiry("CONTACT", {
      name: "  Ana ",
      email: " ana@example.com ",
      message: " Hello ",
    });
    expect(result).toEqual({ success: true, data: contact });
  });

  it("reports one error key per field", () => {
    const result = validateInquiry("CONTACT", {
      name: "",
      email: "not-an-email",
      message: "x".repeat(5001),
    });
    expect(result).toEqual({
      success: false,
      fieldErrors: { name: "required", email: "invalidEmail", message: "tooLong" },
    });
  });

  it("treats missing fields as required", () => {
    const result = validateInquiry("CONTACT", {});
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.fieldErrors).toEqual({
        name: "required",
        email: "required",
        message: "required",
      });
    }
  });

  it("makes the commission budget optional but size required", () => {
    const base = { name: "Ana", email: "ana@example.com", description: "A sea" };
    expect(validateInquiry("COMMISSION", { ...base, size: "60 x 80", budget: "" }).success).toBe(true);
    const missingSize = validateInquiry("COMMISSION", { ...base, size: "", budget: "" });
    expect(missingSize.success).toBe(false);
    if (!missingSize.success) expect(missingSize.fieldErrors).toEqual({ size: "required" });
  });

  it("requires at least one piece for an order, but no message", () => {
    const base = { name: "Ana", email: "ana@example.com", message: "" };
    expect(validateInquiry("ORDER", { ...base, artworkIds: ["art_01"] }).success).toBe(true);
    expect(validateInquiry("ORDER", { ...base, artworkIds: [] }).success).toBe(false);
  });
});

describe("readInquiryForm", () => {
  it("reads only the fields the form type uses", () => {
    const values = readInquiryForm(
      "REQUEST",
      form([
        ["name", "Ana"],
        ["email", "ana@example.com"],
        ["message", "Is it framed?"],
        ["artworkSlug", "low-tide"],
        ["budget", "ignored"],
      ]),
    );
    expect(values).toEqual({
      name: "Ana",
      email: "ana@example.com",
      message: "Is it framed?",
      artworkSlug: "low-tide",
    });
  });

  it("collects every artwork ID for an order", () => {
    const values = readInquiryForm(
      "ORDER",
      form([
        ["artworkIds", "art_01"],
        ["artworkIds", "art_03"],
      ]),
    );
    expect(values.artworkIds).toEqual(["art_01", "art_03"]);
  });
});
