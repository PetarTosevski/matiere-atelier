import "server-only";
import { createHash, randomBytes } from "node:crypto";
import bcrypt from "bcryptjs";

// Password hashing and reset links, shared by the admin and customer accounts.

const COST = 12;

export function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, COST);
}

export function checkPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

/** A hash of a password nobody has, so unknown accounts take as long to check as known ones. */
const DUMMY_HASH = "$2b$12$FVQXovsl3SgiJjNHxtQil.FQI0YcWmLFyf3KVt89G3r/7UegFjm9O";
export async function burnPasswordCheck(password: string): Promise<void> {
  await bcrypt.compare(password, DUMMY_HASH);
}

export const RESET_LINK_MS = 30 * 60 * 1000;
/** Email verification links last longer: the first email can sit unread for a while. */
export const VERIFY_LINK_MS = 24 * 60 * 60 * 1000;

/** A new reset token: the token goes in the email, only its hash is stored. */
export function newResetToken(): { token: string; tokenHash: string } {
  const token = randomBytes(32).toString("base64url");
  return { token, tokenHash: hashResetToken(token) };
}

export function hashResetToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}
