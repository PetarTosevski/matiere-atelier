import "server-only";
import { ConvexHttpClient } from "convex/browser";
import type {
  FunctionArgs,
  FunctionReference,
  FunctionReturnType,
} from "convex/server";
import { api } from "../../convex/_generated/api";

// The only way into Convex. Server-side only: it attaches the shared secret
// that every Convex function checks (convex/guard.ts). Never import this, or
// anything that returns full artworks, into a client component.

export { api };

function deploymentUrl(): string | undefined {
  return process.env.CONVEX_URL || process.env.NEXT_PUBLIC_CONVEX_URL || undefined;
}

export function isConvexConfigured(): boolean {
  return Boolean(deploymentUrl() && process.env.CONVEX_SERVER_SECRET);
}

let client: ConvexHttpClient | null = null;

function getClient(): ConvexHttpClient {
  const url = deploymentUrl();
  if (!url || !process.env.CONVEX_SERVER_SECRET) {
    throw new Error("Convex is not configured: set CONVEX_URL and CONVEX_SERVER_SECRET");
  }
  client ??= new ConvexHttpClient(url);
  return client;
}

type ArgsWithoutSecret<F extends FunctionReference<"query" | "mutation" | "action">> =
  Omit<FunctionArgs<F>, "secret">;

function withSecret<F extends FunctionReference<"query" | "mutation" | "action">>(
  args: ArgsWithoutSecret<F>,
): FunctionArgs<F> {
  return { ...args, secret: process.env.CONVEX_SERVER_SECRET };
}

export function convexQuery<F extends FunctionReference<"query">>(
  fn: F,
  args: ArgsWithoutSecret<F>,
): Promise<FunctionReturnType<F>> {
  return getClient().query(fn, withSecret<F>(args));
}

export function convexMutation<F extends FunctionReference<"mutation">>(
  fn: F,
  args: ArgsWithoutSecret<F>,
): Promise<FunctionReturnType<F>> {
  return getClient().mutation(fn, withSecret<F>(args));
}

let warned = false;

/**
 * Decides where data comes from. Convex when configured; otherwise the static
 * Phase 1 files, but only outside production, so a misconfigured deploy
 * fails loudly instead of quietly serving placeholder artworks.
 */
export function shouldUseStaticData(): boolean {
  if (isConvexConfigured()) return false;
  if (process.env.NODE_ENV === "production") {
    throw new Error("Convex is not configured: set CONVEX_URL and CONVEX_SERVER_SECRET");
  }
  if (!warned && process.env.NODE_ENV !== "test") {
    warned = true;
    console.warn("[data] Convex is not configured; using src/data (development only)");
  }
  return true;
}
