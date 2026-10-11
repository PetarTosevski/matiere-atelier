import { defineRouting } from "next-intl/routing";

// Additional languages are an open decision (see CLAUDE.md). Add them here and
// create messages/<locale>.json; the language switcher picks them up.
export const routing = defineRouting({
  locales: ["en"],
  defaultLocale: "en",
  localePrefix: "always",
});
