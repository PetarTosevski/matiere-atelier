"use server";

import { headers } from "next/headers";
import { hasLocale } from "next-intl";
import { getTranslations } from "next-intl/server";
import { redirect } from "next/navigation";
import type { Id } from "../../../convex/_generated/dataModel";
import type { ForgotPasswordState } from "@/components/auth/ForgotPasswordForm";
import type { NewPasswordState } from "@/components/auth/NewPasswordForm";
import { routing } from "@/i18n/routing";
import { parseAccountForm, type AccountFieldErrors } from "@/lib/account-forms";
import { api, convexMutation, convexQuery } from "@/lib/convex";
import {
  areAccountsAvailable,
  getCustomer,
  renewCustomerSession,
  signInCustomer,
  signOutCustomer,
  updateCustomerSessionVersion,
} from "@/lib/customer-auth";
import { sendMail } from "@/lib/mail";
import { burnPasswordCheck, checkPassword, hashPassword } from "@/lib/password";
import { consumeResetToken, createResetToken } from "@/lib/password-reset";
import { rateLimit } from "@/lib/rate-limit";
import { getSiteUrl, SITE_NAME } from "@/lib/site";

// Collector account actions. Every input is checked with Zod
// (lib/account-forms.ts); passwords are only ever compared as bcrypt hashes.

export type AccountErrorKey =
  | "invalid"
  | "wrongPassword"
  | "emailTaken"
  | "rateLimited"
  | "notConfigured"
  | "sendFailed"
  | "expired"
  | "wrongCurrent";

export type SignInState =
  | { status: "idle" }
  | { status: "error"; error: AccountErrorKey; fieldErrors?: AccountFieldErrors; values?: Record<string, string> }
  | { status: "signedIn"; firstName: string; name: string; email: string; created: boolean };

export type FormState =
  | { status: "idle" }
  | { status: "saved" }
  | { status: "error"; error: AccountErrorKey; fieldErrors?: AccountFieldErrors };

const FIFTEEN_MINUTES = 15 * 60 * 1000;

async function clientIp(): Promise<string> {
  const list = await headers();
  return list.get("x-forwarded-for")?.split(",")[0]?.trim() || list.get("x-real-ip") || "unknown";
}

function localeOf(form: FormData) {
  const value = form.get("locale");
  return hasLocale(routing.locales, value) ? value : routing.defaultLocale;
}

export async function signInAction(_previous: SignInState, form: FormData): Promise<SignInState> {
  if (!areAccountsAvailable()) return { status: "error", error: "notConfigured" };
  const parsed = parseAccountForm("signIn", form);
  if (!parsed.success) return { status: "error", error: "invalid", fieldErrors: parsed.fieldErrors, values: parsed.values };
  if (!(await rateLimit(`account-login:${await clientIp()}`, { limit: 10, windowMs: FIFTEEN_MINUTES }))) {
    return { status: "error", error: "rateLimited", values: parsed.values };
  }

  const { email, password, remember } = parsed.data;
  const account = await convexQuery(api.customers.getByEmail, { email });
  if (!account) {
    // Take as long as a real check, so timing doesn't reveal which emails have accounts.
    await burnPasswordCheck(password);
    return { status: "error", error: "wrongPassword", values: parsed.values };
  }
  if (!(await checkPassword(password, account.passwordHash))) {
    return { status: "error", error: "wrongPassword", values: parsed.values };
  }

  await signInCustomer(account._id, account.sessionVersion, remember);
  return {
    status: "signedIn",
    firstName: account.firstName,
    name: [account.firstName, account.lastName].filter(Boolean).join(" "),
    email: account.email,
    created: false,
  };
}

export async function createAccountAction(_previous: SignInState, form: FormData): Promise<SignInState> {
  if (!areAccountsAvailable()) return { status: "error", error: "notConfigured" };
  const parsed = parseAccountForm("createAccount", form);
  if (!parsed.success) return { status: "error", error: "invalid", fieldErrors: parsed.fieldErrors, values: parsed.values };
  if (!(await rateLimit(`account-create:${await clientIp()}`, { limit: 5, windowMs: 60 * 60 * 1000 }))) {
    return { status: "error", error: "rateLimited", values: parsed.values };
  }

  const { email, firstName, password, newsletter } = parsed.data;
  const id = await convexMutation(api.customers.create, {
    email,
    firstName,
    newsletter,
    passwordHash: await hashPassword(password),
  });
  if (!id) return { status: "error", error: "emailTaken", fieldErrors: {}, values: parsed.values };

  await signInCustomer(id, 1, true);
  return { status: "signedIn", firstName, name: firstName, email, created: true };
}

export async function forgotPasswordAction(
  _previous: ForgotPasswordState,
  form: FormData,
): Promise<ForgotPasswordState> {
  const parsed = parseAccountForm("forgotPassword", form);
  const email = parsed.values.email ?? "";
  if (!parsed.success) return { status: "error", error: "invalidEmail", email };
  if (!areAccountsAvailable()) return { status: "error", error: "notConfigured", email };
  if (!(await rateLimit(`account-reset:${await clientIp()}`, { limit: 5, windowMs: FIFTEEN_MINUTES }))) {
    return { status: "error", error: "rateLimited", email };
  }

  const account = await convexQuery(api.customers.getByEmail, { email: parsed.data.email });
  // The answer is the same whether or not the account exists.
  if (account) {
    const locale = localeOf(form);
    const token = await createResetToken(`customer:${account._id}`);
    const t = await getTranslations({ locale, namespace: "Account.email" });
    const link = `${getSiteUrl().origin}/${locale}/account/reset?token=${token}`;
    try {
      await sendMail({ to: account.email, subject: t("subject", { siteName: SITE_NAME }), text: t("body", { siteName: SITE_NAME, link }) });
    } catch (error) {
      console.error("[account] reset email failed", error);
      return { status: "error", error: "sendFailed", email };
    }
  }
  return { status: "sent", email: parsed.data.email };
}

export async function resetPasswordAction(_previous: NewPasswordState, form: FormData): Promise<NewPasswordState> {
  if (!areAccountsAvailable()) return { error: "notConfigured" };
  const parsed = parseAccountForm("resetPassword", form);
  if (!parsed.success) return { error: "invalid", fieldErrors: parsed.fieldErrors };

  const subject = await consumeResetToken(parsed.data.token);
  if (!subject?.startsWith("customer:")) return { error: "expired" };
  const id = subject.slice("customer:".length) as Id<"customers">;
  const version = await convexMutation(api.customers.setPassword, {
    id,
    passwordHash: await hashPassword(parsed.data.password),
  });
  if (version === null) return { error: "expired" };

  // Other sessions ended with the new version; sign in here again.
  await signOutCustomer();
  redirect(`/${localeOf(form)}/login?reset=done`);
}

export async function signOutAction(form: FormData): Promise<void> {
  await signOutCustomer();
  redirect(`/${localeOf(form)}/originals`);
}

export async function updateDetailsAction(_previous: FormState, form: FormData): Promise<FormState> {
  const customer = await getCustomer();
  if (!customer) redirect(`/${localeOf(form)}/login`);
  const parsed = parseAccountForm("details", form);
  if (!parsed.success) return { status: "error", error: "invalid", fieldErrors: parsed.fieldErrors };

  await convexMutation(api.customers.updateDetails, { id: customer.id, ...parsed.data });
  await renewCustomerSession();
  return { status: "saved" };
}

export async function changePasswordAction(_previous: FormState, form: FormData): Promise<FormState> {
  const customer = await getCustomer();
  if (!customer) redirect(`/${localeOf(form)}/login`);
  const parsed = parseAccountForm("changePassword", form);
  if (!parsed.success) return { status: "error", error: "invalid", fieldErrors: parsed.fieldErrors };
  if (!(await rateLimit(`account-password:${customer.id}`, { limit: 5, windowMs: FIFTEEN_MINUTES }))) {
    return { status: "error", error: "rateLimited" };
  }

  const hash = await convexQuery(api.customers.getPasswordHash, { id: customer.id });
  if (!hash || !(await checkPassword(parsed.data.current, hash))) {
    return { status: "error", error: "wrongCurrent" };
  }
  const version = await convexMutation(api.customers.setPassword, {
    id: customer.id,
    passwordHash: await hashPassword(parsed.data.password),
  });
  if (version !== null) await updateCustomerSessionVersion(version);
  return { status: "saved" };
}
