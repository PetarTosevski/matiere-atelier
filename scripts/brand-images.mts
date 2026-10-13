// npm run brand-images
// Draws the site icon (browser tab), the Apple touch icon and the default
// share image (links to pages that aren't an artwork) in the site's fonts and
// dark palette, and writes them as static files: the icons in src/app, the
// share image in public/ (named in the [locale] layout's metadata), and the
// brush stroke under the heading of the visitor's confirmation email
// (public/email/). Run it again after changing the palette in
// src/app/tokens.css or the site name.
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { createElement as h, type ReactNode } from "react";
import { ImageResponse } from "next/og.js";
import sharp from "sharp";
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

// Confirmation email brush stroke: one dry-brush swash in the light theme's
// olive (emails are light, like most inboxes). Streaky noise cuts the bristle
// gaps, a second noise roughens the edges, and the paint thins out at the end.
// Drawn at twice the size the email shows it (BRUSH_STROKE in lib/confirmation-email.ts).
const OLIVE = "#4f5d2f";
const brush = `<svg xmlns="http://www.w3.org/2000/svg" width="560" height="72" viewBox="0 0 560 72">
  <defs>
    <linearGradient id="dryEnd" x1="0" x2="1" y1="0" y2="0">
      <stop offset="0" stop-color="#fff"/>
      <stop offset="0.7" stop-color="#fff"/>
      <stop offset="1" stop-color="#fff" stop-opacity="0.35"/>
    </linearGradient>
    <mask id="tail"><rect width="560" height="72" fill="url(#dryEnd)"/></mask>
    <filter id="dry" x="-5%" y="-30%" width="110%" height="160%">
      <feTurbulence type="fractalNoise" baseFrequency="0.003 0.28" numOctaves="3" seed="7" result="streaks"/>
      <feColorMatrix in="streaks" type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 -6 4.2" result="bristles"/>
      <feTurbulence type="fractalNoise" baseFrequency="0.06" numOctaves="2" seed="3" result="edge"/>
      <feDisplacementMap in="SourceGraphic" in2="edge" scale="6" xChannelSelector="R" yChannelSelector="G" result="rough"/>
      <feComposite in="rough" in2="bristles" operator="in"/>
    </filter>
  </defs>
  <g mask="url(#tail)">
    <path filter="url(#dry)" fill="${OLIVE}" d="M10 46 C 40 26, 120 16, 260 15 C 380 14, 470 14, 552 12 C 548 26, 536 40, 500 46 C 420 56, 320 54, 220 57 C 140 59, 70 62, 22 60 C 12 58, 8 52, 10 46 Z"/>
  </g>
</svg>`;
mkdirSync("public/email", { recursive: true });
await sharp(Buffer.from(brush)).png({ compressionLevel: 9 }).toFile("public/email/brush-stroke.png");
console.info("wrote public/email/brush-stroke.png (560×72)");
