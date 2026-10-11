// The visitor's chosen display currency, remembered in localStorage. Only a
// currency code is stored; prices and rates always come from the server.

const KEY = "matiere-currency";
const listeners = new Set<() => void>();

function read(): string | null {
  try {
    return localStorage.getItem(KEY);
  } catch {
    return null;
  }
}

export const currencyStore = {
  subscribe(listener: () => void) {
    listeners.add(listener);
    const onStorage = (event: StorageEvent) => {
      if (event.key === KEY) listener();
    };
    window.addEventListener("storage", onStorage);
    return () => {
      listeners.delete(listener);
      window.removeEventListener("storage", onStorage);
    };
  },
  getSnapshot: read,
  /** The server never knows the choice, so it renders the shop currency. */
  getServerSnapshot: (): string | null => null,
  set(code: string | null) {
    try {
      if (code === null) localStorage.removeItem(KEY);
      else localStorage.setItem(KEY, code);
    } catch {
      // Private mode or blocked storage: the choice lasts for this page only.
    }
    listeners.forEach((listener) => listener());
  },
};
