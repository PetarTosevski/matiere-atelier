import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";

// The newsletter's unsubscribe link: the customer's id plus an HMAC of it, so
// it works without signing in but can't be made up for someone else's
// account. It never expires; unsubscribing twice does nothing.

function sign(customerId: string): string {
  const secret = process.env.SESSION_SECRET;
  if (!secret) throw new Error("SESSION_SECRET is not set");
  return createHmac("sha256", secret).update(`unsubscribe:${customerId}`).digest("base64url");
}

export function unsubscribeToken(customerId: string): string {
  return sign(customerId);
}

export function isValidUnsubscribe(customerId: string, token: string): boolean {
  if (!customerId || !token || customerId.length > 64) return false;
  const expected = Buffer.from(sign(customerId));
  const given = Buffer.from(token);
  return expected.length === given.length && timingSafeEqual(expected, given);
}
