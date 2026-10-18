import { NextIntlClientProvider } from "next-intl";
import { createTranslator } from "next-intl";
import type { ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ArtworkCard } from "@/components/ArtworkCard";
import { ArtworkDetails } from "@/components/ArtworkDetails";
import { CartProvider } from "@/components/cart/CartProvider";
import { artworks } from "@/data/artworks";
import { getArtworkMetadata } from "@/lib/metadata";
import { getPriceView } from "@/lib/pricing";
import type { Artwork, SiteSettings } from "@/lib/types";
import messages from "../../messages/en.json";

// Checks that a hidden price is absent from the output itself, not merely
// hidden. Every artwork is given a sentinel amount that can't collide with
// anything else on the page (image widths, dates, sizes).

const SENTINEL = 987654;
const TRACES = ["987654", "9876.54", "9,876.54", "9876", "€"];

const settings = vi.hoisted(() => ({ current: { showPrices: false, currency: "EUR", theme: "dark" as const } }));

vi.mock("@/lib/settings", () => ({
  getSiteSettings: async () => ({ ...settings.current }),
}));

vi.mock("next-intl/server", () => ({
  setRequestLocale: () => {},
  getTranslations: async (
    arg?: string | { namespace?: string },
  ) => {
    const namespace = typeof arg === "string" ? arg : arg?.namespace;
    return createTranslator({
      locale: "en",
      messages,
      namespace: namespace as never,
    });
  },
}));

vi.mock("@/data/artworks", async (importOriginal) => {
  const original = await importOriginal<typeof import("@/data/artworks")>();
  return {
    artworks: original.artworks.map((a) => ({ ...a, priceAmount: 987654 })),
  };
});

const showcase: SiteSettings = { showPrices: false, currency: "EUR", theme: "dark" as const };
const shop: SiteSettings = { showPrices: true, currency: "EUR", theme: "dark" as const };

function render(node: ReactNode): string {
  return renderToStaticMarkup(
    <NextIntlClientProvider locale="en" messages={messages}>
      <CartProvider enabled>{node}</CartProvider>
    </NextIntlClientProvider>,
  );
}

function renderComponents(artwork: Artwork, settings: SiteSettings): string {
  const view = getPriceView(artwork, settings);
  return [
    render(
      <ArtworkCard
        slug={artwork.slug}
        title={artwork.title}
        cover={artwork.images[0]}
        hover={artwork.images[1]}
        dimensions={artwork.dimensions}
        view={view}
        number={1}
      />,
    ),
    render(
      <ArtworkDetails
        id={artwork.id}
        slug={artwork.slug}
        title={artwork.title}
        description={artwork.description}
        dimensions={artwork.dimensions}
        view={view}
      />,
    ),
  ].join("\n");
}

/** Serializes an element tree's props: what the page hands to its children. */
function serializeTree(node: unknown): string {
  return JSON.stringify(node, (key, value) =>
    key === "_owner" || key === "_store" ? undefined : value,
  );
}

function expectNoPrice(output: string) {
  for (const trace of TRACES) expect(output).not.toContain(trace);
  expect(output).not.toContain("priceAmount");
}

const published = artworks.filter((a) => a.published);
const notPriced = published.filter((a) => a.priceMode !== "PRICE");

beforeEach(() => {
  settings.current = { showPrices: false, currency: "EUR", theme: "dark" as const };
});

describe("components", () => {
  it("use the sentinel amount", () => {
    expect(artworks.every((a) => a.priceAmount === SENTINEL)).toBe(true);
  });

  it.each(published.map((a) => [a.slug, a] as const))(
    "showcase mode hides the price of %s",
    (_slug, artwork) => {
      const output = renderComponents(artwork, showcase);
      expectNoPrice(output);
      expect(output).not.toContain("Add to cart");
      expect(output).toContain("Ask about this piece");
    },
  );

  it.each(notPriced.map((a) => [a.priceMode, a.slug, a] as const))(
    "%s mode hides the stored price of %s with prices on",
    (_mode, _slug, artwork) => {
      const output = renderComponents(artwork, shop);
      expectNoPrice(output);
      expect(output).toContain("Ask about this piece");
    },
  );

  it("show the price when they should (control for the checks above)", () => {
    const priced = published.find(
      (a) => a.priceMode === "PRICE" && a.status === "AVAILABLE",
    )!;
    const output = renderComponents(priced, shop);
    expect(output).toContain("€9,876.54");
    expect(output).toContain("Add to cart");
  });

  it("show Sold out and Request this piece for sold priced pieces", () => {
    const sold = published.find(
      (a) => a.priceMode === "PRICE" && a.status === "SOLD",
    )!;
    const output = renderComponents(sold, shop);
    expect(output).toContain("€9,876.54");
    expect(output).toContain("Sold out");
    expect(output).toContain("Request this piece");
    expect(output).not.toContain("Add to cart");
  });
});

describe("pages", () => {
  async function renderArtworkPage(slug: string): Promise<string> {
    const { default: ArtworkPage, generateMetadata } = await import(
      "@/app/[locale]/originals/[slug]/page"
    );
    const params = Promise.resolve({ locale: "en", slug });
    const props = { params, searchParams: Promise.resolve({}) };
    const [tree, metadata] = await Promise.all([
      ArtworkPage(props as never),
      generateMetadata(props as never),
    ]);
    return serializeTree(tree) + JSON.stringify(metadata);
  }

  async function renderOriginalsPage(): Promise<string> {
    const { default: OriginalsPage } = await import(
      "@/app/[locale]/originals/page"
    );
    const props = {
      params: Promise.resolve({ locale: "en" }),
      searchParams: Promise.resolve({}),
    };
    return serializeTree(await OriginalsPage(props));
  }

  it.each(published.map((a) => [a.slug] as const))(
    "artwork page and metadata for %s carry no price in showcase mode",
    async (slug) => {
      expectNoPrice(await renderArtworkPage(slug));
    },
  );

  it.each(notPriced.map((a) => [a.slug] as const))(
    "artwork page and metadata for %s carry no price with prices on",
    async (slug) => {
      settings.current = { showPrices: true, currency: "EUR", theme: "dark" as const };
      expectNoPrice(await renderArtworkPage(slug));
    },
  );

  it("the Originals grid carries no price in showcase mode", async () => {
    expectNoPrice(await renderOriginalsPage());
  });

  it("the page does pass a visible price down (control)", async () => {
    settings.current = { showPrices: true, currency: "EUR", theme: "dark" as const };
    const priced = published.find(
      (a) => a.priceMode === "PRICE" && a.status === "AVAILABLE",
    )!;
    expect(await renderArtworkPage(priced.slug)).toContain(String(SENTINEL));
  });
});

describe("card details", () => {
  it("shows the dimensions under the title, on the card and the artwork page", () => {
    const lowTide = published.find((a) => a.slug === "low-tide")!;
    const output = renderComponents(lowTide, shop);
    expect(output.match(/80 × 100 cm/g)).toHaveLength(2);
  });

  it("adds a hidden-from-screen-readers close-up only when there is a second image", () => {
    const withDetail = published.find((a) => a.images.length > 1)!;
    const single = published.find((a) => a.images.length === 1)!;
    const card = (artwork: Artwork) =>
      render(
        <ArtworkCard
          slug={artwork.slug}
          title={artwork.title}
          cover={artwork.images[0]}
          hover={artwork.images[1]}
          dimensions={artwork.dimensions}
          view={getPriceView(artwork, shop)}
          number={1}
        />,
      );
    expect(card(withDetail).match(/<img/g)).toHaveLength(2);
    expect(card(withDetail)).toContain('aria-hidden="true"');
    expect(card(single).match(/<img/g)).toHaveLength(1);
  });
});

describe("metadata", () => {
  it("never includes a price, even when prices are shown", () => {
    for (const artwork of published) {
      expectNoPrice(JSON.stringify(getArtworkMetadata(artwork, "en")));
    }
  });
});
