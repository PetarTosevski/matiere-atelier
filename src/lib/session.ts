import "server-only";
import { getIronSession, type IronSession, type SessionOptions } from "iron-session";
import { cookies } from "next/headers";

// Shared by the admin and customer sessions. "Keep me signed in" gives a
// 30-day cookie that renews whenever the session is saved again; otherwise the
// cookie ends with the browser and the session expires after a day anyway
// (browsers that restore tabs can keep session cookies alive).

export const REMEMBER_MS = 30 * 24 * 60 * 60 * 1000;
export const BROWSER_SESSION_MS = 24 * 60 * 60 * 1000;

export type SessionTiming = {
  /** Unix ms; the session is ignored after this. */
  expiresAt?: number;
  remember?: boolean;
};

type CookieSpec = { cookieName: string; path: string };

function options({ cookieName, path }: CookieSpec, remember: boolean): SessionOptions {
  const password = process.env.SESSION_SECRET;
  if (!password || password.length < 32) {
    throw new Error("SESSION_SECRET must be at least 32 characters");
  }
  const cookieOptions = {
    httpOnly: true,
    // Browsers drop secure cookies on plain-http localhost.
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path,
  };
  return remember
    ? { password, cookieName, ttl: REMEMBER_MS / 1000, cookieOptions: { ...cookieOptions, maxAge: REMEMBER_MS / 1000 } }
    : // No maxAge: a browser-session cookie. expiresAt still limits it.
      { password, cookieName, cookieOptions: { ...cookieOptions, maxAge: undefined } };
}

export async function readSession<T extends SessionTiming>(spec: CookieSpec): Promise<IronSession<T>> {
  return getIronSession<T>(await cookies(), options(spec, true));
}

export function isLive(session: SessionTiming, now = Date.now()): boolean {
  return typeof session.expiresAt === "number" && session.expiresAt > now;
}

/** Saves the session with a fresh expiry (sign-in, and renewals). */
export async function saveSession<T extends SessionTiming>(
  session: IronSession<T>,
  spec: CookieSpec,
  remember: boolean,
): Promise<void> {
  session.remember = remember;
  session.expiresAt = Date.now() + (remember ? REMEMBER_MS : BROWSER_SESSION_MS);
  session.updateConfig(options(spec, remember));
  await session.save();
}

/** Renews a remembered session that is past a day old; call from actions only. */
export async function renewSession<T extends SessionTiming>(session: IronSession<T>, spec: CookieSpec): Promise<void> {
  if (!session.remember || !isLive(session)) return;
  if (session.expiresAt! - Date.now() > REMEMBER_MS - BROWSER_SESSION_MS) return;
  await saveSession(session, spec, true);
}
