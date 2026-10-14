import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { TURNSTILE_FIELD, verifyTurnstile } from "./turnstile";

const withToken = (token?: string) => {
  const form = new FormData();
  if (token !== undefined) form.set(TURNSTILE_FIELD, token);
  return form;
};

const cloudflareSays = (success: boolean) =>
  vi.stubGlobal("fetch", vi.fn(async () => Response.json({ success, "error-codes": success ? [] : ["invalid-input-response"] })));

beforeEach(() => {
  vi.stubEnv("TURNSTILE_SECRET_KEY", "secret");
  vi.spyOn(console, "warn").mockImplementation(() => {});
  vi.spyOn(console, "error").mockImplementation(() => {});
});
afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("verifyTurnstile", () => {
  it("is off without a secret key", async () => {
    vi.stubEnv("TURNSTILE_SECRET_KEY", "");
    expect(await verifyTurnstile(withToken(), "203.0.113.1")).toBe(true);
  });

  it("refuses a form without a token, without asking Cloudflare", async () => {
    cloudflareSays(true);
    expect(await verifyTurnstile(withToken(), "203.0.113.1")).toBe(false);
    expect(fetch).not.toHaveBeenCalled();
  });

  it("sends the secret, token and IP, and follows Cloudflare's answer", async () => {
    cloudflareSays(true);
    expect(await verifyTurnstile(withToken("tok"), "203.0.113.1")).toBe(true);
    const body = vi.mocked(fetch).mock.calls[0]![1]!.body as URLSearchParams;
    expect(Object.fromEntries(body)).toEqual({ secret: "secret", response: "tok", remoteip: "203.0.113.1" });

    cloudflareSays(false);
    expect(await verifyTurnstile(withToken("used"), "203.0.113.1")).toBe(false);
  });

  it("lets visitors through when Cloudflare can't be reached", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => { throw new Error("offline"); }));
    expect(await verifyTurnstile(withToken("tok"), "unknown")).toBe(true);
  });
});
