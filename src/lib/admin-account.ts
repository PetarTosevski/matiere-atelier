import "server-only";
import { randomBytes } from "node:crypto";
import { getTranslations } from "next-intl/server";
import { routing } from "@/i18n/routing";
import { adminEmail, setAdminPassword, signInAdmin, signOutAdmin } from "@/lib/auth";
import { api, convexMutation, isConvexConfigured } from "@/lib/convex";
import { signInCustomer, signOutCustomer } from "@/lib/customer-auth";
import { sendMail } from "@/lib/mail";
import { hashPassword } from "@/lib/password";
import { createResetToken } from "@/lib/password-reset";
import { getSiteUrl, SITE_NAME } from "@/lib/site";

// The admin is also a user: signing in as the admin signs in the admin's own
// customer account (email = ADMIN_USERNAME) too, so the storefront header shows
// who is really signed in. Its password is always the admin password.

export type AccountSummary = { firstName: string; name: string; email: string };

export function isAdminEmail(email: string): boolean {
  return email.trim().toLowerCase() === adminEmail();
}

/** "petar.tosevski99@…" becomes "Petar"; editable later under Account details. */
function firstNameFrom(email: string): string {
  const word = email.split("@")[0]!.split(/[._\-+\d]/).find(Boolean) ?? email;
  return word.charAt(0).toUpperCase() + word.slice(1);
}

/** Signs in the admin's customer account (creating it the first time). */
export async function signInAdminCustomer(remember: boolean): Promise<AccountSummary | null> {
  const email = adminEmail();
  if (!email || !isConvexConfigured()) return null;
  const account = await convexMutation(api.customers.ensure, {
    email,
    firstName: firstNameFrom(email),
    // Never used for sign-in (the admin password is), but the field is required.
    passwordHash: await hashPassword(randomBytes(32).toString("base64url")),
  });
  await signInCustomer(account.id, account.sessionVersion, remember);
  return {
    firstName: account.firstName,
    name: [account.firstName, account.lastName].filter(Boolean).join(" "),
    email: account.email,
  };
}

/** One sign-in for both: the admin session and the admin's customer account. */
export async function signInAsAdmin(remember: boolean): Promise<AccountSummary | null> {
  await signInAdmin(remember);
  return signInAdminCustomer(remember);
}

/** One sign-out for both. */
export async function signOutEverywhere(): Promise<void> {
  await signOutAdmin();
  await signOutCustomer();
}

/** A new admin password ends every admin session and every session of the admin's account. */
export async function changeAdminPassword(password: string): Promise<void> {
  await setAdminPassword(password);
  const email = adminEmail();
  if (email && isConvexConfigured()) await convexMutation(api.customers.endSessions, { email });
}

/** Emails an admin reset link to ADMIN_USERNAME. Throws when sending fails. */
export async function sendAdminResetEmail(): Promise<void> {
  const email = adminEmail();
  if (!email) return;
  const token = await createResetToken("admin");
  const t = await getTranslations({ locale: routing.defaultLocale, namespace: "Admin.reset.email" });
  const link = `${getSiteUrl().origin}/admin/reset?token=${token}`;
  await sendMail({ to: email, subject: t("subject", { siteName: SITE_NAME }), text: t("body", { link }), sender: "noreply" });
}
