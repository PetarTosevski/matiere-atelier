import type { Theme } from "@/lib/types";

// A visitor's own theme choice, remembered in localStorage. Without one the
// site default (SiteSettings.theme, set in the admin) applies.

export const THEME_KEY = "matiere-theme";
const listeners = new Set<() => void>();

const isTheme = (value: unknown): value is Theme => value === "dark" || value === "light";

function read(): Theme | null {
  try {
    const value = localStorage.getItem(THEME_KEY);
    return isTheme(value) ? value : null;
  } catch {
    return null;
  }
}

export const themeStore = {
  subscribe(listener: () => void) {
    listeners.add(listener);
    const onStorage = (event: StorageEvent) => {
      if (event.key === THEME_KEY) listener();
    };
    window.addEventListener("storage", onStorage);
    return () => {
      listeners.delete(listener);
      window.removeEventListener("storage", onStorage);
    };
  },
  getSnapshot: read,
  getServerSnapshot: (): Theme | null => null,
  set(theme: Theme) {
    try {
      localStorage.setItem(THEME_KEY, theme);
    } catch {
      // Blocked storage: the choice lasts until the next page load.
    }
    document.documentElement.dataset.theme = theme;
    listeners.forEach((listener) => listener());
  },
};
