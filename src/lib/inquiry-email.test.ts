import { createTranslator } from "next-intl";
import { describe, expect, it } from "vitest";
import { buildInquiryEmail, type Translate } from "@/lib/inquiry-email";
import messages from "../../messages/en.json";

const translator = createTranslator({ locale: "en", messages, namespace: "Email" });
const t: Translate = (key, values) => translator(key as never, values as never);

describe("buildInquiryEmail", () => {
  it("builds a contact email", () => {
    const email = buildInquiryEmail(
      { type: "CONTACT", data: { name: "Ana", email: "ana@example.com", message: "Hello there" } },
      t,
      7,
    );
    expect(email.subject).toBe("CONTACT #7 · Ana");
    expect(email.text).toContain("Name: Ana");
    expect(email.text).toContain("Email: ana@example.com");
    expect(email.text).toContain("Hello there");
    expect(email.text).toContain("Reply to this email to answer Ana directly.");
  });

  it("names the piece and links to it in a request", () => {
    const email = buildInquiryEmail(
      {
        type: "REQUEST",
        data: { name: "Ana", email: "ana@example.com", message: "Framed?", artworkSlug: "low-tide" },
        artwork: { title: "Low Tide", url: "https://example.com/en/originals/low-tide" },
      },
      t,
      3,
    );
    expect(email.subject).toBe("REQUEST #3 · Low Tide · Ana");
    expect(email.text).toContain("Piece: Low Tide (https://example.com/en/originals/low-tide)");
  });

  it("lists every piece and the total in an order", () => {
    const email = buildInquiryEmail(
      {
        type: "ORDER",
        data: { name: "Ana", email: "ana@example.com", message: "", artworkIds: ["a", "b"] },
        items: [
          { title: "Low Tide", url: "https://x/1", price: "€1,450" },
          { title: "Quiet Orchard", url: "https://x/2", price: "€640.50" },
        ],
        totals: ["€2,090.50"],
      },
      t,
      12,
    );
    expect(email.subject).toBe("ORDER #12 · Ana");
    expect(email.text).toContain("- Low Tide, €1,450 (https://x/1)");
    expect(email.text).toContain("- Quiet Orchard, €640.50 (https://x/2)");
    expect(email.text).toContain("Total: €2,090.50");
    expect(email.text).toContain("Message:\nNot given");
  });

  it("shows an empty optional budget as Not given", () => {
    const email = buildInquiryEmail(
      {
        type: "COMMISSION",
        data: { name: "Ana", email: "ana@example.com", description: "A sea", size: "60 x 80", budget: "" },
      },
      t,
    );
    expect(email.text).toContain("Approximate size: 60 x 80");
    expect(email.text).toContain("Budget: Not given");
    // Without the database there is no number.
    expect(email.subject).toBe("COMMISSION · Ana");
  });

  it("keeps visitor line breaks out of the subject", () => {
    const email = buildInquiryEmail(
      { type: "CONTACT", data: { name: "Ana\r\nBcc: x@evil.test", email: "a@b.co", message: "Hi" } },
      t,
    );
    expect(email.subject).not.toMatch(/[\r\n]/);
  });
});
