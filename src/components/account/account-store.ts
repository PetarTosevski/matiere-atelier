// Who is signed in, as far as this browser knows: set on sign-in and on the
// account page, cleared on sign-out and whenever the login page finds no
// session. Only the header and form prefill use it; every account page and
// action checks the session cookie on the server.

export type AccountHint = { firstName: string; name: string; email: string };

const KEY = "matiere-account";
const listeners = new Set<() => void>();

// useSyncExternalStore needs the same object back while nothing changed.
let cachedRaw: string | null = null;
let cached: AccountHint | null = null;

function read(): AccountHint | null {
  let raw: string | null = null;
  try {
    raw = localStorage.getItem(KEY);
  } catch {
    return null;
  }
  if (raw === cachedRaw) return cached;
  cachedRaw = raw;
  cached = null;
  try {
    const value = raw ? (JSON.parse(raw) as Partial<AccountHint>) : null;
    if (value && typeof value.firstName === "string" && typeof value.email === "string") {
      cached = { firstName: value.firstName, name: typeof value.name === "string" ? value.name : value.firstName, email: value.email };
    }
  } catch {
    // Unreadable: treat as signed out.
  }
  return cached;
}

function write(hint: AccountHint | null) {
  try {
    if (hint) localStorage.setItem(KEY, JSON.stringify(hint));
    else localStorage.removeItem(KEY);
  } catch {
    // Blocked storage: the header keeps showing "Login".
  }
  listeners.forEach((listener) => listener());
}

export const accountStore = {
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
  getServerSnapshot: (): AccountHint | null => null,
  set: (hint: AccountHint) => {
    const current = read();
    if (current && current.firstName === hint.firstName && current.name === hint.name && current.email === hint.email) return;
    write(hint);
  },
  clear: () => {
    if (read()) write(null);
  },
};
