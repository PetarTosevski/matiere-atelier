"use client";

import { useTranslations } from "next-intl";
import { useSyncExternalStore } from "react";
import type { Theme } from "@/lib/types";
import { themeStore } from "./theme-store";

/**
 * The sun/moon button from "Art Storefront Screens": a square icon button that
 * shows the current theme (sun in light, moon in dark) and switches to the
 * other one for this visitor; remembered in the browser. Screen readers hear
 * "Dark mode" as a toggle that is on or off.
 */
export function ThemeToggle({ siteTheme }: { siteTheme: Theme }) {
  const t = useTranslations("ThemeToggle");
  const stored = useSyncExternalStore(themeStore.subscribe, themeStore.getSnapshot, themeStore.getServerSnapshot);
  const theme = stored ?? siteTheme;
  const next: Theme = theme === "dark" ? "light" : "dark";

  return (
    <button
      type="button"
      onClick={() => themeStore.set(next)}
      aria-label={t("label")}
      aria-pressed={theme === "dark"}
      className="inline-flex size-10 shrink-0 items-center justify-center border border-control hover:border-accent hover:text-accent"
    >
      {theme === "light" ? (
        <svg aria-hidden="true" viewBox="0 0 24 24" className="size-[1.125rem]" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
          <circle cx="12" cy="12" r="4" />
          <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
        </svg>
      ) : (
        <svg aria-hidden="true" viewBox="0 0 24 24" className="size-[1.125rem]" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <path d="M20 14.5A8 8 0 0 1 9.5 4 8 8 0 1 0 20 14.5z" />
        </svg>
      )}
    </button>
  );
}
