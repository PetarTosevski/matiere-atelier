import type { routing } from "@/i18n/routing";
import type messages from "../messages/en.json";

// Type-checks locales and message keys: a missing key in en.json is a
// typecheck error rather than a blank string at runtime.
declare module "next-intl" {
  interface AppConfig {
    Locale: (typeof routing.locales)[number];
    Messages: typeof messages;
  }
}
