// npm run brand-images
// Draws the site icon (browser tab), the Apple touch icon and the default
// share image (links to pages that aren't an artwork) in the site's fonts and
// dark palette, and writes them as static files: the icons in src/app, the
// share image in public/ (named in the [locale] layout's metadata). Run it again
// after changing the palette in src/app/tokens.css or the site name.
import { readFileSync, writeFileSync } from "node:fs";
import { createElement as h, type ReactNode } from "react";
import { ImageResponse } from "next/og.js";
import { SITE_NAME } from "../src/lib/site.ts";

const messages = JSON.parse(readFileSync("messages/en.json", "utf8"));
const description: string = messages.Metadata.description;

// From src/app/tokens.css (the dark theme, the default every visitor sees).
const PAPER = "#15130f";
const PANEL = "#1e1b16";
const INK = "#efe9df";
const MUTED = "#b9b1a4";
const ACCENT = "#a9b87e";
const LINE = "#36322a";

/** The TTF of one Google Font weight (Satori, behind ImageResponse, can't read woff2). */
async function googleFont(family: string, spec: string): Promise<ArrayBuffer> {
  const css = await (
    await fetch(`https://fonts.googleapis.com/css2?family=${family.replaceAll(" ", "+")}:${spec}`)
  ).text();
  const url = css.match(/url\((https:[^)]+\.ttf)\)/)?.[1];
  if (!url) throw new Error(`No TTF for ${family} ${spec}`);
  return (await fetch(url)).arrayBuffer();
}

const fonts = [
  { name: "Cormorant", data: await googleFont("Cormorant Garamond", "wght@500"), weight: 500 as const, style: "normal" as const },
  { name: "Cormorant", data: await googleFont("Cormorant Garamond", "ital,wght@1,500"), weight: 500 as const, style: "italic" as const },
  { name: "Karla", data: await googleFont("Karla", "wght@400"), weight: 400 as const, style: "normal" as const },
];

async function render(file: string, width: number, height: number, element: ReactNode) {
  const image = new ImageResponse(element as never, { width, height, fonts });
  writeFileSync(file, Buffer.from(await image.arrayBuffer()));
  console.info(`wrote ${file} (${width}×${height})`);
}

/** The first letter of the name in the accent, on the gallery-wall dark. */
function monogram(size: number, radius: number) {
  return h(
    "div",
    {
      style: {
        width: "100%",
        height: "100%",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: PAPER,
        borderRadius: radius,
        color: ACCENT,
        fontFamily: "Cormorant",
        fontSize: size,
        lineHeight: 1,
        // Cormorant's capitals sit high in their box; nudge to the optical centre.
        paddingBottom: size * 0.08,
      },
    },
    SITE_NAME.charAt(0),
  );
}

// Browser tabs: rounded corners, since the tab shows the square as is.
await render("src/app/icon.png", 512, 512, monogram(400, 96));
// iOS rounds the corners itself, so the Apple icon stays square.
await render("src/app/apple-icon.png", 180, 180, monogram(140, 0));

// Default share image: the name with its last word in the accent, as on the
// Originals title, and the site description.
const [first, ...rest] = SITE_NAME.split(" ");
await render(
  "public/share-image.png",
  1200,
  630,
  h(
    "div",
    {
      style: {
        width: "100%",
        height: "100%",
        display: "flex",
        padding: 48,
        background: PAPER,
      },
    },
    h(
      "div",
      {
        style: {
          flex: 1,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          background: PANEL,
          border: `1px solid ${LINE}`,
        },
      },
      h(
        "div",
        { style: { display: "flex", gap: 28, fontFamily: "Cormorant", fontSize: 132, lineHeight: 1, color: INK } },
        h("span", null, first),
        rest.length > 0 ? h("span", { style: { fontStyle: "italic", color: ACCENT } }, rest.join(" ")) : null,
      ),
      h("div", { style: { width: 96, height: 1, background: LINE, marginTop: 44, marginBottom: 36 } }),
      h("div", { style: { fontFamily: "Karla", fontSize: 30, color: MUTED } }, description),
    ),
  ),
);
