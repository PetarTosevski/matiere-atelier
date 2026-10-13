import "server-only";
import { api, convexMutation, convexQuery } from "@/lib/convex";
import { hashResetToken, newResetToken, RESET_LINK_MS } from "@/lib/password";

// One-time links sent by email. subject is "admin" or "customer:<id>" for
// password resets, "verify:<id>" to confirm a new account's email.

/** Makes a link for `subject` (replacing any earlier one); returns the token for the email. */
export async function createResetToken(subject: string, lifetimeMs = RESET_LINK_MS): Promise<string> {
  const { token, tokenHash } = newResetToken();
  await convexMutation(api.passwordResets.create, { tokenHash, subject, expiresAt: Date.now() + lifetimeMs });
  return token;
}

/** The subject of a still-valid link, without using it up. */
export async function checkResetToken(token: string): Promise<string | null> {
  if (!token) return null;
  return convexQuery(api.passwordResets.check, { tokenHash: hashResetToken(token) });
}

/** Uses up a link; returns its subject, or null when unknown or expired. */
export async function consumeResetToken(token: string): Promise<string | null> {
  return convexMutation(api.passwordResets.consume, { tokenHash: hashResetToken(token) });
}
