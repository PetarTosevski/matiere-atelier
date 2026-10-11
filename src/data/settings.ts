import type { SiteSettings } from "@/lib/types";

// Phase 1 site settings. Set showPrices to false to preview showcase mode:
// every price, the cart icon and all "Add to cart" buttons disappear.
export const siteSettings: SiteSettings = {
  showPrices: true,
  currency: "EUR",
  theme: "dark",
};
