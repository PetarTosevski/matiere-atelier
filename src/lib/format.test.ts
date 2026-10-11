import { describe, expect, it } from "vitest";
import { formatPrice } from "@/lib/format";

// Intl uses non-breaking spaces in some locales; compare with plain spaces.
const plain = (value: string) => value.replace(/[  ]/g, " ");

describe("formatPrice", () => {
  it("shows EUR with the € symbol and drops decimals for whole amounts", () => {
    expect(formatPrice(145000, "EUR", "en")).toBe("€1,450");
    expect(formatPrice(100, "EUR", "en")).toBe("€1");
    expect(formatPrice(0, "EUR", "en")).toBe("€0");
  });

  it("keeps the cents when the amount is not whole", () => {
    expect(formatPrice(64050, "EUR", "en")).toBe("€640.50");
    expect(formatPrice(64001, "EUR", "en")).toBe("€640.01");
  });

  it("formats large amounts exactly from integer minor units", () => {
    expect(formatPrice(123456789, "EUR", "en")).toBe("€1,234,567.89");
  });

  it("uses the narrow symbol for other currencies", () => {
    expect(formatPrice(250000, "USD", "en")).toBe("$2,500");
  });

  it("respects currencies without minor units", () => {
    expect(formatPrice(5000, "JPY", "en")).toBe("¥5,000");
  });

  it("respects currencies with three minor units", () => {
    expect(plain(formatPrice(1234567, "KWD", "en"))).toMatch(/1,234\.567/);
    expect(plain(formatPrice(1234000, "KWD", "en"))).toMatch(/1,234$/);
  });

  it("follows the active locale's conventions", () => {
    expect(plain(formatPrice(145000, "EUR", "de"))).toBe("1.450 €");
    expect(plain(formatPrice(64050, "EUR", "de"))).toBe("640,50 €");
  });

  it.each([12.5, Number.NaN, Number.POSITIVE_INFINITY])(
    "rejects %s because money is integer minor units",
    (amount) => {
      expect(() => formatPrice(amount, "EUR", "en")).toThrow(RangeError);
    },
  );
});
