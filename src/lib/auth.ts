import "server-only";
import { redirect } from "next/navigation";
import { api, convexMutation, convexQuery, isConvexConfigured } from "@/lib/convex";
import { checkPassword, hashPassword } from "@/lib/password";
import { isLive, readSession, renewSession, saveSession, type SessionTiming } from "@/lib/session";

// Admin sign-in. The admin signs in with ADMIN_USERNAME (an email address).
// The password hash comes from ADMIN_PASSWORD_HASH until the password is
// reset from the site; after that it lives in Convex (adminCredentials). The
// plaintext password is never stored. Every admin page, server action and
// route handler checks the session itself.

type AdminSession = SessionTiming & { username?: string; version?: number };

const COOKIE = {
  cookieName: "matiere_admin",
  // Only sent to admin URLs, never with storefront requests.
  path: "/admin",
};

export function adminEmail(): string | null {
  return process.env.ADMIN_USERNAME?.trim().toLowerCase() || null;
}

/** The current password hash and session version (0 while the env hash is used). */
async function credentials(): Promise<{ passwordHash: string; sessionVersion: number } | null> {
  if (isConvexConfigured()) {
    const stored = await convexQuery(api.adminCredentials.get, {});
    if (stored) return stored;
  }
  const hash = process.env.ADMIN_PASSWORD_HASH;
  return hash ? { passwordHash: hash, sessionVersion: 0 } : null;
}

export function isAdminConfigured(): boolean {
  return Boolean(adminEmail() && process.env.ADMIN_PASSWORD_HASH);
}

export async function getAdminSession() {
  return readSession<AdminSession>(COOKIE);
}

export async function isAdmin(): Promise<boolean> {
  const session = await getAdminSession();
  const expected = adminEmail();
  if (!expected || session.username !== expected || !isLive(session)) return false;
  // A password reset bumps the version, which signs out every older session.
  return session.version === (await credentials())?.sessionVersion;
}

/** For admin pages: sends visitors without a session to the login page. */
export async function requireAdminPage(): Promise<void> {
  if (!(await isAdmin())) redirect("/admin/login");
}

export class UnauthorizedError extends Error {
  constructor() {
    super("Not signed in");
  }
}

/** For admin server actions and route handlers. Renews a remembered session. */
export async function requireAdmin(): Promise<void> {
  if (!(await isAdmin())) throw new UnauthorizedError();
  await renewSession(await getAdminSession(), COOKIE);
}

export async function verifyCredentials(email: string, password: string): Promise<boolean> {
  const expected = adminEmail();
  const current = await credentials();
  if (!expected || !current) return false;
  // Always run the comparison, so a wrong email takes as long as a wrong password.
  const passwordMatches = await checkPassword(password, current.passwordHash);
  return passwordMatches && email.trim().toLowerCase() === expected;
}

export async function signInAdmin(remember: boolean): Promise<void> {
  const session = await getAdminSession();
  session.username = adminEmail()!;
  session.version = (await credentials())?.sessionVersion ?? 0;
  await saveSession(session, COOKIE, remember);
}

export async function signOutAdmin(): Promise<void> {
  (await getAdminSession()).destroy();
}

/** Stores a new admin password in Convex; every existing session ends. */
export async function setAdminPassword(password: string): Promise<void> {
  await convexMutation(api.adminCredentials.setPassword, { passwordHash: await hashPassword(password) });
}
