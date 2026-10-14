import "server-only";
import { createHash, randomBytes, randomInt } from "node:crypto";
import { getTranslations } from "next-intl/server";
import { routing } from "@/i18n/routing";
import { adminEmail } from "@/lib/auth";
import { api, convexMutation, isConvexConfigured } from "@/lib/convex";
import { sendMail } from "@/lib/mail";
import { readSession } from "@/lib/session";
import { getSiteUrl, SITE_NAME } from "@/lib/site";

// Two-step admin sign-in: the right password only earns a 6-digit code,
// emailed to ADMIN_USERNAME, which must be typed in the same browser within
// 10 minutes. A short-lived cookie holds a random nonce that is part of the
// stored hash, so the code is useless without the browser that gave the
// password, and the password is useless without the inbox. Used by both
// sign-in forms (/admin/login and the storefront's /login).

const CODE_MS = 10 * 60 * 1000;
const MAX_ATTEMPTS = 5;
const SUBJECT = "admin-code";

type PendingSignIn = { nonce?: string; remember?: boolean; until?: number };

const COOKIE = {
  cookieName: "matiere_admin_code",
  // Both sign-in pages post to their own URL: /admin/login and /<locale>/login.
  path: "/",
};

const hashCode = (nonce: string, code: string) =>
  createHash("sha256").update(`${nonce}:${code}`).digest("hex");

/** The code step needs Convex; local development without it signs straight in. */
export function isAdminCodeRequired(): boolean {
  return isConvexConfigured() || process.env.NODE_ENV === "production";
}

/** After a correct password: emails a new code and remembers this browser. Throws when sending fails. */
export async function sendAdminCode(remember: boolean): Promise<void> {
  const email = adminEmail();
  if (!email) throw new Error("ADMIN_USERNAME is not set");
  const code = String(randomInt(0, 1_000_000)).padStart(6, "0");
  const nonce = randomBytes(32).toString("base64url");
  const until = Date.now() + CODE_MS;
  // Replaces any earlier code, which also resets the wrong-guess count.
  await convexMutation(api.passwordResets.create, { tokenHash: hashCode(nonce, code), subject: SUBJECT, expiresAt: until });

  const session = await readSession<PendingSignIn>(COOKIE);
  Object.assign(session, { nonce, remember, until });
  await session.save();

  const t = await getTranslations({ locale: routing.defaultLocale, namespace: "Admin.code.email" });
  await sendMail({
    to: email,
    subject: t("subject", { code, siteName: SITE_NAME }),
    text: t("body", { code, forgotLink: `${getSiteUrl().origin}/admin/forgot` }),
    sender: "noreply",
  });
}

export type AdminCodeResult = { status: "ok"; remember: boolean } | { status: "wrong" } | { status: "expired" };

/** Checks a typed code against this browser's pending sign-in; "ok" uses it up. */
export async function checkAdminCode(code: string): Promise<AdminCodeResult> {
  const session = await readSession<PendingSignIn>(COOKIE);
  const { nonce, remember = false, until = 0 } = session;
  if (!nonce || until <= Date.now()) return { status: "expired" };

  const typed = code.replace(/\s+/g, "");
  if (!/^\d{6}$/.test(typed)) return { status: "wrong" };
  const result = await convexMutation(api.passwordResets.checkCode, {
    subject: SUBJECT,
    tokenHash: hashCode(nonce, typed),
    maxAttempts: MAX_ATTEMPTS,
  });
  if (result === "wrong") return { status: "wrong" };
  session.destroy();
  return result === "ok" ? { status: "ok", remember } : { status: "expired" };
}
