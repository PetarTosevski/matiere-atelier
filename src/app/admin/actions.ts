"use server";

import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { parseAboutForm, type AboutFormErrors } from "@/lib/about-form";
import { parseArtworkForm, type ArtworkFormErrors } from "@/lib/artwork-form";
import {
  createArtwork,
  deleteArtwork,
  getAllArtworksForAdmin,
  getArtworkForAdmin,
  reorderArtworks,
  setArtworkStatus,
  updateArtwork,
} from "@/lib/artworks";
import { getAdminSession, requireAdmin, UnauthorizedError, verifyCredentials } from "@/lib/auth";
import { saveAboutPage } from "@/lib/pages";
import { rateLimit } from "@/lib/rate-limit";
import { setShowPrices } from "@/lib/settings";
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

export type SaveArtworkState = {
  status: "idle" | "error";
  errors?: ArtworkFormErrors;
  failed?: boolean;
};

export async function saveArtworkAction(
  _previous: SaveArtworkState,
  form: FormData,
): Promise<SaveArtworkState> {
  return asAdmin(async () => {
    const id = String(form.get("id") ?? "");
    const existing = id ? await getArtworkForAdmin(id) : null;
    if (id && !existing) return { status: "error", failed: true };

    const all = await getAllArtworksForAdmin();
    // New pieces go first on Originals.
    const firstSortOrder = Math.min(1, ...all.map((artwork) => artwork.sortOrder)) - 1;
    const parsed = parseArtworkForm(form, existing, firstSortOrder);
    if (!parsed.ok) return { status: "error", errors: parsed.errors };

    const slugOwner = all.find((artwork) => artwork.slug === parsed.input.slug);
    if (slugOwner && slugOwner.id !== id) {
      return { status: "error", errors: { slug: "slugTaken" } };
    }

    try {
      if (existing) await updateArtwork(existing.id, parsed.input);
      else await createArtwork(parsed.input);
    } catch (error) {
      console.error("[admin] saving artwork failed", error);
      return { status: "error", failed: true };
    }

    refreshStorefront();
    redirect(`/admin?saved=${encodeURIComponent(parsed.input.slug)}`);
  });
}

export async function deleteArtworkAction(form: FormData): Promise<void> {
  await asAdmin(async () => {
    await deleteArtwork(String(form.get("id") ?? ""));
    refreshStorefront();
  });
  redirect("/admin?deleted=1");
}

export async function setStatusAction(form: FormData): Promise<void> {
  await asAdmin(async () => {
    const status = form.get("status") === "SOLD" ? "SOLD" : "AVAILABLE";
    await setArtworkStatus(String(form.get("id") ?? ""), status);
    refreshStorefront();
  });
  revalidatePath("/admin");
}

/** Moves one artwork a step up or down in the Originals order. */
export async function moveArtworkAction(form: FormData): Promise<void> {
  await asAdmin(async () => {
    const id = String(form.get("id") ?? "");
    const step = form.get("direction") === "up" ? -1 : 1;
    const ids = (await getAllArtworksForAdmin()).map((artwork) => artwork.id);
    const from = ids.indexOf(id);
    const to = from + step;
    if (from === -1 || to < 0 || to >= ids.length) return;
    [ids[from], ids[to]] = [ids[to]!, ids[from]!];
    await reorderArtworks(ids);
    refreshStorefront();
  });
  revalidatePath("/admin");
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

// ---- Settings ----

export type SettingsState = { saved: boolean };

export async function saveSettingsAction(
  _previous: SettingsState,
  form: FormData,
): Promise<SettingsState> {
  return asAdmin(async () => {
    await setShowPrices(form.get("showPrices") === "on");
    refreshStorefront();
    return { saved: true };
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
