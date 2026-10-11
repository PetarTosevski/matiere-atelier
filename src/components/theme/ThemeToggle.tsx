"use client";

import { useTranslations } from "next-intl";
import { useSyncExternalStore } from "react";
import type { Theme } from "@/lib/types";
import { themeStore } from "./theme-store";

/**
 * Shows the current theme ("Dark mode") and switches to the other one for
 * this visitor; remembered in the browser.
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
      aria-label={t("label", { theme })}
      className="inline-flex min-h-11 items-center gap-2 hover:text-accent"
    >
      {theme === "light" ? (
        <svg aria-hidden="true" viewBox="0 0 24 24" className="size-[1.15em]" fill="none" stroke="currentColor" strokeWidth="1.5">
          <circle cx="12" cy="12" r="4" />
          <path d="M12 2.5v2M12 19.5v2M2.5 12h2M19.5 12h2M5.3 5.3l1.4 1.4M17.3 17.3l1.4 1.4M5.3 18.7l1.4-1.4M17.3 6.7l1.4-1.4" />
        </svg>
      ) : (
        <svg aria-hidden="true" viewBox="0 0 24 24" className="size-[1.15em]" fill="none" stroke="currentColor" strokeWidth="1.5">
          <path d="M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5Z" />
        </svg>
      )}
      <span aria-hidden="true">{theme === "light" ? t("light") : t("dark")}</span>
    </button>
  );
}
