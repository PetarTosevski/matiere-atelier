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

  it("shows yen and won as whole amounts (stored in hundredths like every currency)", () => {
    expect(formatPrice(500000, "JPY", "en")).toBe("¥5,000");
    expect(formatPrice(16000000, "KRW", "en")).toBe("₩160,000");
  });

  it("gives dollar and yuan currencies other than USD their own symbol", () => {
    expect(formatPrice(162500, "AUD", "en")).toBe("A$1,625");
    expect(formatPrice(162500, "HKD", "en")).toBe("HK$1,625");
    expect(formatPrice(162500, "CNY", "en")).toBe("CN¥1,625");
    expect(formatPrice(162500, "INR", "en")).toBe("₹1,625");
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
