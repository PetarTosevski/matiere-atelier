"use server";

import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { parseAboutForm, type AboutFormErrors } from "@/lib/about-form";
import type { ArtworkFormErrors } from "@/lib/artwork-form";
import { applyCollectionChanges, deleteArtwork, getAllArtworksForAdmin } from "@/lib/artworks";
import { parseCollectionChanges, toEditorWork, type EditorWork } from "@/lib/collection-changes";
import { getAdminSession, requireAdmin, UnauthorizedError, verifyCredentials } from "@/lib/auth";
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
}

// ---- Sign in ----

export type LoginState = {
  error: "invalid" | "rateLimited" | "notConfigured" | null;
  /** Echoed back so a typo in the password doesn't clear the username. */
  username?: string;
};

export async function loginAction(_previous: LoginState, form: FormData): Promise<LoginState> {
  if (!process.env.ADMIN_USERNAME || !process.env.ADMIN_PASSWORD_HASH) {
    return { error: "notConfigured" };
  }
  const username = String(form.get("username") ?? "").slice(0, 200);
  const password = String(form.get("password") ?? "");

  if (!(await rateLimit(`login:${await clientIp()}`, { limit: 5, windowMs: 15 * 60 * 1000 }))) {
    return { error: "rateLimited", username };
  }
  if (!(await verifyCredentials(username, password))) return { error: "invalid", username };

  const session = await getAdminSession();
  session.username = username;
  await session.save();
  redirect("/admin");
}

export async function logoutAction(): Promise<void> {
  const session = await getAdminSession();
  session.destroy();
  redirect("/admin/login");
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
