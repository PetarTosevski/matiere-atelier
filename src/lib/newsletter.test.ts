import { createTranslator } from "next-intl";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { artworks } from "@/data/artworks";
import messages from "../../messages/en.json";

const mocks = vi.hoisted(() => ({
  convexQuery: vi.fn(),
  convexMutation: vi.fn(),
  sendMail: vi.fn(),
  settings: { showPrices: true, currency: "EUR", theme: "dark" },
}));

vi.mock("@/lib/convex", () => ({
  api: { customers: { newsletterSubscribers: "subscribers", unsubscribe: "unsubscribe" } },
  convexQuery: mocks.convexQuery,
  convexMutation: mocks.convexMutation,
  isConvexConfigured: () => true,
}));
vi.mock("@/lib/artworks", () => ({
  getArtworksByIds: async (ids: string[]) => artworks.filter((artwork) => ids.includes(artwork.id)),
}));
vi.mock("@/lib/settings", () => ({ getSiteSettings: async () => mocks.settings }));
vi.mock("@/lib/mail", () => ({ sendMail: mocks.sendMail }));
vi.mock("@/lib/site", () => ({ SITE_NAME: "Matière Atelier", getSiteUrl: () => new URL("https://www.example.com") }));
vi.mock("next-intl/server", () => ({
  getTranslations: async ({ namespace }: { namespace: string }) =>
    createTranslator({ locale: "en", messages, namespace: namespace as never }),
}));

vi.stubEnv("SESSION_SECRET", "x".repeat(32));
const { announceNewWork, unsubscribe } = await import("./newsletter");
const { unsubscribeToken } = await import("./unsubscribe");

const priced = artworks.find((artwork) => artwork.published && artwork.priceMode === "PRICE" && artwork.priceAmount)!;
const subscribers = [
  { id: "c1", email: "ana@example.com", firstName: "Ana" },
  { id: "c2", email: "ben@example.com", firstName: "Ben" },
];

beforeEach(() => {
  vi.clearAllMocks();
  mocks.convexQuery.mockResolvedValue(subscribers);
  mocks.sendMail.mockResolvedValue(undefined);
  mocks.settings = { showPrices: true, currency: "EUR", theme: "dark" };
});

describe("announceNewWork", () => {
  it("sends each subscriber their own email from newsletter@, with an unsubscribe link and header", async () => {
    await announceNewWork([priced.id]);
    expect(mocks.sendMail).toHaveBeenCalledTimes(2);
    const mail = mocks.sendMail.mock.calls[0]![0];
    expect(mail).toMatchObject({ to: "ana@example.com", sender: "newsletter", subject: `New work: ${priced.title}` });
    expect(mail.text).toContain("Hello Ana,");
    // Title first, then the description under the painting.
    expect(mail.html.indexOf(`>${priced.title}</a>`)).toBeGreaterThan(0);
    expect(mail.html.indexOf(`>${priced.title}</a>`)).toBeLessThan(mail.html.indexOf("<img src=\"https://www.example.com/_next/image"));
    const words = priced.description.replace(/[*_#>`[\]]/g, "").split(/\s+/).slice(0, 3).join(" ");
    expect(mail.text).toContain(words);
    // Size and price come after the description, the price in its own cell.
    expect(mail.html.indexOf(words)).toBeLessThan(mail.html.indexOf("€"));
    expect(mail.html).toMatch(/<td align="right"[^>]*>€/);
    expect(mail.text).toContain(`https://www.example.com/en/originals/${priced.slug}`);
    const token = unsubscribeToken("c1");
    expect(mail.text).toContain(`https://www.example.com/en/unsubscribe?c=c1&t=${token}`);
    expect(mail.headers).toEqual({
      "List-Unsubscribe": `<https://www.example.com/api/unsubscribe?c=c1&t=${token}>`,
      "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
    });
    // The cover goes through Next's resizer at a quality it allows (Next 16: 75 only).
    expect(mail.html).toMatch(/\/_next\/image\?url=[^"]+&amp;w=1080&amp;q=75"/);
    // Nobody sees anyone else's address.
    expect(mocks.sendMail.mock.calls[1]![0].to).toBe("ben@example.com");
  });

  it("shows the price as the site does, and never in showcase mode", async () => {
    await announceNewWork([priced.id]);
    expect(mocks.sendMail.mock.calls[0]![0].text).toContain("€");

    mocks.sendMail.mockClear();
    mocks.settings = { ...mocks.settings, showPrices: false };
    await announceNewWork([priced.id]);
    const mail = mocks.sendMail.mock.calls[0]![0];
    expect(mail.text).not.toContain("€");
    expect(mail.html).not.toContain("€");
  });

  it("names the count when several pieces go up at once", async () => {
    const two = artworks.filter((artwork) => artwork.published).slice(0, 2);
    await announceNewWork(two.map((artwork) => artwork.id));
    expect(mocks.sendMail.mock.calls[0]![0].subject).toBe("2 new works at Matière Atelier");
  });

  it("sends nothing without subscribers, and keeps going when one email fails", async () => {
    mocks.convexQuery.mockResolvedValue([]);
    await announceNewWork([priced.id]);
    expect(mocks.sendMail).not.toHaveBeenCalled();

    mocks.convexQuery.mockResolvedValue(subscribers);
    mocks.sendMail.mockRejectedValueOnce(new Error("smtp down"));
    vi.spyOn(console, "error").mockImplementation(() => {});
    await expect(announceNewWork([priced.id])).resolves.toBeUndefined();
    expect(mocks.sendMail).toHaveBeenCalledTimes(2);
  });
});

describe("emailImageSize", () => {
  it("fits the painting in the mat without cropping, and keeps tall ones short", async () => {
    const { emailImageSize } = await import("./new-work-email");
    expect(emailImageSize(2000, 1000)).toEqual({ width: 448, height: 224 });
    expect(emailImageSize(1000, 2000)).toEqual({ width: 240, height: 480 });
  });
});

describe("unsubscribe", () => {
  it("turns the emails off only for a genuine link", async () => {
    expect(await unsubscribe("c1", unsubscribeToken("c1"))).toBe(true);
    expect(mocks.convexMutation).toHaveBeenCalledWith("unsubscribe", { id: "c1" });

    mocks.convexMutation.mockClear();
    expect(await unsubscribe("c2", unsubscribeToken("c1"))).toBe(false);
    expect(await unsubscribe("c1", "made-up")).toBe(false);
    expect(mocks.convexMutation).not.toHaveBeenCalled();
  });
});
