import { createTranslator } from "next-intl";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { artworks } from "@/data/artworks";
import { resetRateLimits } from "@/lib/rate-limit";
import { STUDIO_EMAIL } from "@/lib/site";
import messages from "../../../messages/en.json";
import { submitInquiry, type InquiryState } from "./inquiry";

const mocks = vi.hoisted(() => ({
  sendMail: vi.fn(),
  ip: "203.0.113.1",
  settings: { showPrices: true, currency: "EUR", theme: "dark" as const },
}));

vi.mock("@/lib/mail", () => ({ sendMail: mocks.sendMail }));
vi.mock("@/lib/settings", () => ({
  getSiteSettings: async () => ({ ...mocks.settings }),
}));
vi.mock("next/headers", () => ({
  headers: async () => new Headers({ "x-forwarded-for": `${mocks.ip}, 10.0.0.1` }),
}));
vi.mock("next-intl/server", () => ({
  getTranslations: async ({ namespace }: { namespace: string }) =>
    createTranslator({ locale: "en", messages, namespace: namespace as never }),
}));

const idle: InquiryState = { status: "idle" };
const id = (slug: string) => artworks.find((a) => a.slug === slug)!.id;

function form(entries: Record<string, string | string[]>) {
  const data = new FormData();
  for (const [key, value] of Object.entries(entries)) {
    for (const item of Array.isArray(value) ? value : [value]) data.append(key, item);
  }
  return data;
}

const contact = {
  type: "CONTACT",
  locale: "en",
  name: "Ana",
  email: "ana@example.com",
  message: "Hello",
};

beforeEach(() => {
  resetRateLimits();
  mocks.sendMail.mockReset();
  mocks.sendMail.mockResolvedValue(undefined);
  mocks.ip = "203.0.113.1";
  mocks.settings = { showPrices: true, currency: "EUR", theme: "dark" as const };
});

describe("submitInquiry", () => {
  it("sends a valid contact message with reply-to set to the visitor", async () => {
    const state = await submitInquiry(idle, form(contact));
    expect(state).toEqual({ status: "success" });
    // The artist first, then the visitor's confirmation.
    expect(mocks.sendMail).toHaveBeenCalledTimes(2);
    expect(mocks.sendMail.mock.calls[0]![0]).toMatchObject({
      replyTo: "ana@example.com",
      subject: "Message from Ana",
    });
    expect(mocks.sendMail.mock.calls[0]![0].to).toBeUndefined();
  });

  it("confirms to the visitor without repeating what they typed", async () => {
    await submitInquiry(idle, form({ ...contact, name: "Visit spam.example", message: "Buy now" }));
    const confirmation = mocks.sendMail.mock.calls[1]![0];
    expect(confirmation).toMatchObject({
      to: "ana@example.com",
      replyTo: STUDIO_EMAIL,
      subject: "Your message to Matière Atelier",
    });
    expect(confirmation.html).toContain("/email/brush-stroke.png");
    for (const part of [confirmation.text, confirmation.html]) {
      expect(part).not.toContain("spam.example");
      expect(part).not.toContain("Buy now");
    }
  });

  it("still succeeds when only the confirmation fails", async () => {
    mocks.sendMail.mockResolvedValueOnce(undefined).mockRejectedValueOnce(new Error("bounced"));
    vi.spyOn(console, "error").mockImplementation(() => {});
    const state = await submitInquiry(idle, form(contact));
    expect(state).toEqual({ status: "success" });
  });

  it("pretends to succeed but sends nothing when the honeypot is filled", async () => {
    const state = await submitInquiry(idle, form({ ...contact, company: "Spam Inc" }));
    expect(state).toEqual({ status: "success" });
    expect(mocks.sendMail).not.toHaveBeenCalled();
  });

  it("returns field errors and echoes the values back", async () => {
    const state = await submitInquiry(idle, form({ ...contact, email: "nope" }));
    expect(state).toMatchObject({
      status: "error",
      error: "invalid",
      fieldErrors: { email: "invalidEmail" },
      values: { name: "Ana", email: "nope", message: "Hello" },
    });
    expect(mocks.sendMail).not.toHaveBeenCalled();
  });

  it("rejects an unknown form type", async () => {
    const state = await submitInquiry(idle, form({ ...contact, type: "ADMIN" }));
    expect(state).toEqual({ status: "error", error: "invalid" });
  });

  it("rate limits each IP after 5 messages", async () => {
    for (let i = 0; i < 5; i++) {
      expect((await submitInquiry(idle, form(contact))).status).toBe("success");
    }
    expect(await submitInquiry(idle, form(contact))).toMatchObject({
      status: "error",
      error: "rateLimited",
    });
    mocks.ip = "198.51.100.7";
    expect((await submitInquiry(idle, form(contact))).status).toBe("success");
  });

  it("includes the piece and its link in a request", async () => {
    await submitInquiry(
      idle,
      form({ ...contact, type: "REQUEST", artworkSlug: "harbour-wall", message: "Any similar?" }),
    );
    const mail = mocks.sendMail.mock.calls[0]![0];
    expect(mail.subject).toBe("Inquiry about Harbour Wall from Ana");
    expect(mail.text).toContain("/en/originals/harbour-wall");
  });

  it("refuses a request for a draft or unknown piece", async () => {
    for (const artworkSlug of ["untitled-draft", "nope"]) {
      const state = await submitInquiry(idle, form({ ...contact, type: "REQUEST", artworkSlug }));
      expect(state).toMatchObject({ status: "error", error: "unavailable" });
    }
    expect(mocks.sendMail).not.toHaveBeenCalled();
  });

  it("prices an order from the server, not the browser", async () => {
    const state = await submitInquiry(
      idle,
      form({
        ...contact,
        type: "ORDER",
        message: "",
        artworkIds: [id("low-tide"), id("quiet-orchard")],
        // A tampered price field is simply ignored.
        price: "1",
      }),
    );
    expect(state).toEqual({ status: "success" });
    const mail = mocks.sendMail.mock.calls[0]![0];
    expect(mail.text).toContain("Low Tide, €1,450");
    expect(mail.text).toContain("Quiet Orchard, €640.50");
    expect(mail.text).toContain("Total: €2,090.50");
    const confirmation = mocks.sendMail.mock.calls[1]![0];
    expect(confirmation.subject).toBe("Your order request to Matière Atelier");
    expect(confirmation.text).toContain("Nothing has been charged");
    expect(confirmation.text).toContain("Low Tide, €1,450");
    expect(confirmation.text).toContain("Total: €2,090.50");
  });

  it("refuses an order that includes a sold or unpriced piece", async () => {
    for (const slug of ["harbour-wall", "study-in-umber", "untitled-draft"]) {
      const state = await submitInquiry(
        idle,
        form({ ...contact, type: "ORDER", artworkIds: [id("low-tide"), id(slug)] }),
      );
      expect(state).toMatchObject({ status: "error", error: "cartChanged" });
    }
    expect(mocks.sendMail).not.toHaveBeenCalled();
  });

  it("refuses orders in showcase mode", async () => {
    mocks.settings = { showPrices: false, currency: "EUR", theme: "dark" as const };
    const state = await submitInquiry(
      idle,
      form({ ...contact, type: "ORDER", artworkIds: [id("low-tide")] }),
    );
    expect(state).toMatchObject({ status: "error", error: "unavailable" });
  });

  it("reports a failed send without losing the visitor's text", async () => {
    mocks.sendMail.mockRejectedValue(new Error("SMTP down"));
    vi.spyOn(console, "error").mockImplementation(() => {});
    const state = await submitInquiry(idle, form(contact));
    expect(state).toMatchObject({
      status: "error",
      error: "sendFailed",
      values: { message: "Hello" },
    });
    // No confirmation for an inquiry the artist never got.
    expect(mocks.sendMail).toHaveBeenCalledOnce();
  });
});
