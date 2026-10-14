import "server-only";

// Checks the Cloudflare Turnstile token a form sent (components/Turnstile.tsx).
// Without TURNSTILE_SECRET_KEY the check is off, so development and a deploy
// made before the keys are set keep working.

const VERIFY_URL = "https://challenges.cloudflare.com/turnstile/v0/siteverify";
export const TURNSTILE_FIELD = "cf-turnstile-response";

export function isTurnstileEnabled(): boolean {
  return Boolean(process.env.TURNSTILE_SECRET_KEY);
}

/** True when the form's token is valid, or when the check is off. */
export async function verifyTurnstile(form: FormData, ip: string): Promise<boolean> {
  const secret = process.env.TURNSTILE_SECRET_KEY;
  if (!secret) return true;
  const token = form.get(TURNSTILE_FIELD);
  if (typeof token !== "string" || token === "" || token.length > 2048) return false;

  const body = new URLSearchParams({ secret, response: token });
  if (ip !== "unknown") body.set("remoteip", ip);
  try {
    const response = await fetch(VERIFY_URL, { method: "POST", body, signal: AbortSignal.timeout(5000) });
    const result = (await response.json()) as { success?: boolean; "error-codes"?: string[] };
    if (!result.success) console.warn("[turnstile] refused", result["error-codes"]);
    return result.success === true;
  } catch (error) {
    // Cloudflare unreachable: let real visitors through; the rate limits still apply.
    console.error("[turnstile] verification unavailable", error);
    return true;
  }
}
