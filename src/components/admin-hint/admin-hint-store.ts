// "This browser belongs to the artist": set while she is signed in to the
// admin, cleared when she logs out. It only decides whether the storefront
// shows an "Edit" link; the admin still checks the session on the server, so
// setting it by hand just leads to the login page.

const KEY = "matiere-admin";
const listeners = new Set<() => void>();

function read(): boolean {
  try {
    return localStorage.getItem(KEY) === "1";
  } catch {
    return false;
  }
}

function write(on: boolean) {
  try {
    if (on) localStorage.setItem(KEY, "1");
    else localStorage.removeItem(KEY);
  } catch {
    // Blocked storage: no Edit link, nothing else changes.
  }
  listeners.forEach((listener) => listener());
}

export const adminHintStore = {
  subscribe(listener: () => void) {
    listeners.add(listener);
    const onStorage = (event: StorageEvent) => {
      if (event.key === KEY || event.key === null) listener();
    };
    window.addEventListener("storage", onStorage);
    return () => {
      listeners.delete(listener);
      window.removeEventListener("storage", onStorage);
    };
  },
  getSnapshot: read,
  getServerSnapshot: () => false,
  set: () => write(true),
  clear: () => write(false),
};
