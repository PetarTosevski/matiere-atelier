import { MAX_CART_ITEMS } from "@/lib/cart";

// The cart's only browser state: a list of artwork IDs in localStorage.
// Shaped for useSyncExternalStore, and kept in sync across tabs.

const KEY = "matiere-atelier:cart";
const EMPTY: string[] = [];
const listeners = new Set<() => void>();

let cachedRaw: string | null | undefined;
let cachedIds: string[] = EMPTY;

function parse(raw: string | null): string[] {
  if (!raw) return EMPTY;
  try {
    const value: unknown = JSON.parse(raw);
    if (!Array.isArray(value)) return EMPTY;
    const ids = value.filter((id): id is string => typeof id === "string");
    return [...new Set(ids)].slice(0, MAX_CART_ITEMS);
  } catch {
    return EMPTY;
  }
}

function getSnapshot(): string[] {
  let raw: string | null = null;
  try {
    raw = window.localStorage.getItem(KEY);
  } catch {
    // Storage can be unavailable (private mode, blocked site data).
  }
  // Same string, same array: useSyncExternalStore needs a stable snapshot.
  if (raw !== cachedRaw) {
    cachedRaw = raw;
    cachedIds = parse(raw);
  }
  return cachedIds;
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  const onStorage = (event: StorageEvent) => {
    if (event.key === KEY || event.key === null) listener();
  };
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", onStorage);
  };
}

function set(ids: string[]) {
  const next = [...new Set(ids)].slice(0, MAX_CART_ITEMS);
  try {
    window.localStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    // Keep working for this page view even if storage is unavailable.
    cachedRaw = JSON.stringify(next);
    cachedIds = next;
  }
  for (const listener of listeners) listener();
}

export const cartStore = {
  subscribe,
  getSnapshot,
  getServerSnapshot: () => EMPTY,
  set,
};
