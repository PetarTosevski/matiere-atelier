import "server-only";
import type { Id } from "../../convex/_generated/dataModel";
import { api, convexQuery, isConvexConfigured } from "@/lib/convex";
import { isLive, readSession, renewSession, saveSession, type SessionTiming } from "@/lib/session";

// Collector accounts. The session cookie is sent with every request, but only
// the login and account pages and server actions read it, so storefront pages
// stay static. The header learns who is signed in from a hint in the browser
// (components/account/account-store.ts), never from the server.

type CustomerSession = SessionTiming & { customerId?: string; version?: number };

const COOKIE = { cookieName: "matiere_account", path: "/" };

export type Customer = {
  id: Id<"customers">;
  email: string;
  firstName: string;
  lastName: string;
  newsletter: boolean;
};

export function areAccountsAvailable(): boolean {
  return isConvexConfigured();
}

async function session() {
  return readSession<CustomerSession>(COOKIE);
}

/** The signed-in customer, or null. */
export async function getCustomer(): Promise<Customer | null> {
  if (!areAccountsAvailable()) return null;
  const current = await session();
  if (!current.customerId || !isLive(current)) return null;
  let account;
  try {
    account = await convexQuery(api.customers.get, { id: current.customerId as Id<"customers"> });
  } catch {
    // A malformed or foreign ID; treat it as signed out.
    return null;
  }
  // A password change bumps the version, which signs out other sessions.
  if (!account || account.sessionVersion !== current.version) return null;
  return {
    id: account.id,
    email: account.email,
    firstName: account.firstName,
    lastName: account.lastName,
    newsletter: account.newsletter,
  };
}

export async function signInCustomer(id: Id<"customers">, version: number, remember: boolean): Promise<void> {
  const current = await session();
  current.customerId = id;
  current.version = version;
  await saveSession(current, COOKIE, remember);
}

/** After a password change: keep this session, with the new version. */
export async function updateCustomerSessionVersion(version: number): Promise<void> {
  const current = await session();
  current.version = version;
  await saveSession(current, COOKIE, current.remember ?? false);
}

export async function renewCustomerSession(): Promise<void> {
  await renewSession(await session(), COOKIE);
}

export async function signOutCustomer(): Promise<void> {
  (await session()).destroy();
}
