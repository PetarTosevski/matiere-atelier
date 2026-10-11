import "server-only";
import bcrypt from "bcryptjs";
import { getIronSession, type SessionOptions } from "iron-session";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

// Admin sign-in. Credentials come from env (ADMIN_USERNAME and a bcrypt
// ADMIN_PASSWORD_HASH); the plaintext password is never stored. Every admin
// page, server action and route handler checks the session itself.

type AdminSession = { username?: string };

const SEVEN_DAYS = 60 * 60 * 24 * 7;

function sessionOptions(): SessionOptions {
  const password = process.env.SESSION_SECRET;
  if (!password || password.length < 32) {
    throw new Error("SESSION_SECRET must be at least 32 characters");
  }
  return {
    password,
    cookieName: "matiere_admin",
    ttl: SEVEN_DAYS,
    cookieOptions: {
      httpOnly: true,
      // Browsers drop secure cookies on plain-http localhost.
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: SEVEN_DAYS,
      // Only sent to admin URLs, never with storefront requests.
      path: "/admin",
    },
  };
}

export async function getAdminSession() {
  return getIronSession<AdminSession>(await cookies(), sessionOptions());
}

export async function isAdmin(): Promise<boolean> {
  const session = await getAdminSession();
  const expected = process.env.ADMIN_USERNAME;
  return Boolean(expected && session.username === expected);
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

/** For admin server actions and route handlers. */
export async function requireAdmin(): Promise<void> {
  if (!(await isAdmin())) throw new UnauthorizedError();
}

export async function verifyCredentials(username: string, password: string): Promise<boolean> {
  const expectedUser = process.env.ADMIN_USERNAME;
  const hash = process.env.ADMIN_PASSWORD_HASH;
  if (!expectedUser || !hash) return false;
  // Always run the comparison, so a wrong username takes as long as a wrong password.
  const passwordMatches = await bcrypt.compare(password, hash);
  return passwordMatches && username === expectedUser;
}
