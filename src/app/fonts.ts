import { Cormorant_Garamond, Karla } from "next/font/google";

// Self-hosted at build time by next/font: no request to Google from the
// visitor's browser. The CSS variables feed --font-sans and --font-serif
// in tokens.css.

export const karla = Karla({
  subsets: ["latin", "latin-ext"],
  weight: ["400", "600"],
  variable: "--font-karla",
});

export const cormorant = Cormorant_Garamond({
  subsets: ["latin", "latin-ext"],
  weight: ["400", "500"],
  style: ["normal", "italic"],
  variable: "--font-cormorant",
});

export const fontVariables = `${karla.variable} ${cormorant.variable}`;
