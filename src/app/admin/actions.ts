"use server";

import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { parseAboutForm, type AboutFormErrors } from "@/lib/about-form";
import type { ArtworkFormErrors } from "@/lib/artwork-form";
import { applyCollectionChanges, deleteArtwork, getAllArtworksForAdmin } from "@/lib/artworks";
import { parseCollectionChanges, toEditorWork, type EditorWork } from "@/lib/collection-changes";
import type { ForgotPasswordState } from "@/components/auth/ForgotPasswordForm";
import type { NewPasswordState } from "@/components/auth/NewPasswordForm";
import { parseAccountForm } from "@/lib/account-forms";
import {
  changeAdminPassword,
  isAdminEmail,
  sendAdminResetEmail,
  signInAdminCustomer,
  signInAsAdmin,
  signOutEverywhere,
  type AccountSummary,
} from "@/lib/admin-account";
import { getAdminSession, isAdminConfigured, requireAdmin, UnauthorizedError, verifyCredentials } from "@/lib/auth";
import { checkAdminCode, isAdminCodeRequired, sendAdminCode } from "@/lib/admin-code";
import { getCustomer } from "@/lib/customer-auth";
import { isConvexConfigured } from "@/lib/convex";
import { consumeResetToken } from "@/lib/password-reset";
import { isShopCurrency } from "@/lib/currency";
import { getExchangeRate, type ExchangeRate } from "@/lib/exchange-rates";
import { saveAboutPage } from "@/lib/pages";
import type { SiteSettings } from "@/lib/types";
import { rateLimit } from "@/lib/rate-limit";
import { discardFiles } from "@/lib/storage";

// Every action checks the admin session on the server first. Being unlinked
// is not security, and neither is a proxy check on its own.

async function clientIp(): Promise<string> {
  const list = await headers();
  return list.get("x-forwarded-for")?.split(",")[0]?.trim() || list.get("x-real-ip") || "unknown";
}

/** Runs `fn` as the admin, or sends an expired session back to login. */
async function asAdmin<T>(fn: () => Promise<T>): Promise<T> {
  try {
    await requireAdmin();
  } catch (error) {
    if (error instanceof UnauthorizedError) redirect("/admin/login");
    throw error;
  }
  return fn();
}

/** Storefront pages are static: refresh them after any change. */
function refreshStorefront() {
  revalidatePath("/", "layout");
  revalidatePath("/sitemap.xml");
}

// ---- Sign in ----

export type LoginState = {
  error: "invalid" | "rateLimited" | "notConfigured" | "sendFailed" | "codeWrong" | "codeExpired" | null;
  /** Echoed back so a typo in the password doesn't clear the email. */
  email?: string;
  /** "code": the password was right and a code went to the admin's email. */
  step?: "code";
};

const FIFTEEN_MINUTES = 15 * 60 * 1000;

/** Step one checks the password and emails a code; step two (a "code" field) checks the code. */
export async function loginAction(_previous: LoginState, form: FormData): Promise<LoginState> {
  if (!isAdminConfigured()) return { error: "notConfigured" };
  if (form.has("code")) return verifyCode(String(form.get("code") ?? "").slice(0, 20));
  const email = String(form.get("email") ?? "").slice(0, 254);
  const password = String(form.get("password") ?? "").slice(0, 1000);
  const remember = form.get("remember") === "on";

  if (!(await rateLimit(`login:${await clientIp()}`, { limit: 5, windowMs: FIFTEEN_MINUTES }))) {
    return { error: "rateLimited", email };
  }
  if (!(await verifyCredentials(email, password))) return { error: "invalid", email };

  if (isAdminCodeRequired()) {
    try {
      await sendAdminCode(remember);
    } catch (error) {
      console.error("[admin] sign-in code email failed", error);
      return { error: "sendFailed", email };
    }
    return { error: null, email, step: "code" };
  }
  await signInAsAdmin(remember);
  redirect("/admin");
}

async function verifyCode(code: string): Promise<LoginState> {
  if (!(await rateLimit(`admin-code:${await clientIp()}`, { limit: 10, windowMs: FIFTEEN_MINUTES }))) {
    return { error: "rateLimited", step: "code" };
  }
  const result = await checkAdminCode(code);
  if (result.status === "wrong") return { error: "codeWrong", step: "code" };
  if (result.status === "expired") return { error: "codeExpired" };
  await signInAsAdmin(result.remember);
  redirect("/admin");
}

export async function logoutAction(): Promise<void> {
  // The admin is also signed in as a user; log out of both.
  await signOutEverywhere();
  redirect("/admin/login");
}

/**
 * Called by every admin page: makes sure the admin's customer account is the
 * one signed in on the storefront (replacing another customer, or a session
 * from before accounts were linked) and returns it for the header.
 */
export async function syncAdminAccountAction(): Promise<AccountSummary | null> {
  return asAdmin(async () => {
    const customer = await getCustomer();
    if (customer && isAdminEmail(customer.email)) {
      return {
        firstName: customer.firstName,
        name: [customer.firstName, customer.lastName].filter(Boolean).join(" "),
        email: customer.email,
      };
    }
    return signInAdminCustomer((await getAdminSession()).remember ?? false);
  });
}

// ---- Forgotten password ----


/** Emails a reset link when the address is the admin's. The answer is the same either way. */
export async function forgotPasswordAction(
  _previous: ForgotPasswordState,
  form: FormData,
): Promise<ForgotPasswordState> {
  const parsed = parseAccountForm("forgotPassword", form);
  const email = parsed.values.email ?? "";
  if (!parsed.success) return { status: "error", error: "invalidEmail", email };
  if (!isConvexConfigured()) return { status: "error", error: "notConfigured", email };
  if (!(await rateLimit(`reset:${await clientIp()}`, { limit: 5, windowMs: 15 * 60 * 1000 }))) {
    return { status: "error", error: "rateLimited", email };
  }

  if (isAdminEmail(parsed.data.email)) {
    try {
      await sendAdminResetEmail();
    } catch (error) {
      console.error("[admin] reset email failed", error);
      return { status: "error", error: "sendFailed", email };
    }
  }
  return { status: "sent", email: parsed.data.email };
}

export async function resetPasswordAction(_previous: NewPasswordState, form: FormData): Promise<NewPasswordState> {
  const parsed = parseAccountForm("resetPassword", form);
  if (!parsed.success) return { error: "invalid", fieldErrors: parsed.fieldErrors };
  if ((await consumeResetToken(parsed.data.token)) !== "admin") return { error: "expired" };
  await changeAdminPassword(parsed.data.password);
  // Every session ended with the reset; sign in again with the new password.
  await signOutEverywhere();
  redirect("/admin/login?reset=done");
}

// ---- Artworks ----

export type PublishState =
  | { status: "published"; works: EditorWork[]; settings: SiteSettings }
  | {
      status: "error";
      /** Field errors per piece, by key. */
      errors?: Record<string, ArtworkFormErrors>;
      /** Saving failed for a reason the artist can't fix in the form. */
      failed?: boolean;
    };

/**
 * Publishes everything the artist changed on the collection page in one go:
 * order, details, new pieces and the site settings (currency, "Show prices", theme).
 */
export async function publishChangesAction(changes: unknown): Promise<PublishState> {
  return asAdmin(async () => {
    const saved = await getAllArtworksForAdmin();
    const parsed = parseCollectionChanges(changes, saved);
    if (!parsed.ok) {
      const hasFieldErrors = Object.keys(parsed.errors).length > 0;
      return { status: "error", errors: parsed.errors, failed: !hasFieldErrors };
    }
    const settings: SiteSettings = { currency: parsed.currency, showPrices: parsed.showPrices, theme: parsed.theme };
    try {
      await applyCollectionChanges(settings, parsed.artworks);
    } catch (error) {
      console.error("[admin] publishing changes failed", error);
      return { status: "error", failed: true };
    }
    refreshStorefront();
    const works = (await getAllArtworksForAdmin()).map(toEditorWork);
    return { status: "published", works, settings };
  });
}

/** Today's exchange rate for converting prices when the shop currency changes. */
export async function exchangeRateAction(from: unknown, to: unknown): Promise<ExchangeRate | null> {
  return asAdmin(async () => {
    if (!isShopCurrency(from) || !isShopCurrency(to) || from === to) return null;
    return getExchangeRate(from, to);
  });
}

/** Deletes a saved artwork and its images right away (after confirmation). */
export async function deleteArtworkAction(id: unknown): Promise<{ ok: boolean }> {
  return asAdmin(async () => {
    if (typeof id !== "string" || !id) return { ok: false };
    try {
      await deleteArtwork(id);
    } catch (error) {
      console.error("[admin] deleting artwork failed", error);
      return { ok: false };
    }
    refreshStorefront();
    return { ok: true };
  });
}

/** Removes uploads taken out of the form before it was saved. */
export async function discardUploadsAction(storageIds: string[]): Promise<void> {
  await asAdmin(async () => {
    if (!Array.isArray(storageIds)) return;
    const ids = storageIds.filter((id) => typeof id === "string").slice(0, 20);
    try {
      await discardFiles(ids);
    } catch (error) {
      // Refused when a saved artwork still uses the file; nothing to clean up then.
      console.warn("[admin] discarding uploads skipped", error);
    }
  });
}

// ---- About page ----

export type AboutState = { status: "idle" | "saved" | "error"; errors?: AboutFormErrors; failed?: boolean };

export async function saveAboutAction(_previous: AboutState, form: FormData): Promise<AboutState> {
  return asAdmin(async () => {
    const parsed = parseAboutForm(form);
    if (!parsed.ok) return { status: "error", errors: parsed.errors };
    try {
      await saveAboutPage(parsed.input);
    } catch (error) {
      console.error("[admin] saving About failed", error);
      return { status: "error", failed: true };
    }
    refreshStorefront();
    return { status: "saved" };
  });
}
