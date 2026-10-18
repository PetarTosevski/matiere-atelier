import { createHash } from "node:crypto";
import { createTranslator } from "next-intl";
import { beforeEach, describe, expect, it, vi } from "vitest";
import messages from "../../messages/en.json";

const mocks = vi.hoisted(() => ({
  convexMutation: vi.fn(),
  sendMail: vi.fn(),
  // The rule misreads this cast: without it the type is {} and the tests can't read fields.
  // eslint-disable-next-line @typescript-eslint/no-unnecessary-type-assertion
  cookie: {} as Record<string, unknown>,
}));

vi.mock("@/lib/auth", () => ({ adminEmail: () => "sara@example.com" }));
vi.mock("@/lib/convex", () => ({
  api: { passwordResets: { create: "create", checkCode: "checkCode" } },
  convexMutation: mocks.convexMutation,
  isConvexConfigured: () => true,
}));
vi.mock("@/lib/mail", () => ({ sendMail: mocks.sendMail }));
// A stand-in for the iron-session cookie: one object for the whole test.
vi.mock("@/lib/session", () => ({
  readSession: async () =>
    Object.assign(mocks.cookie, {
      save: async () => {},
      destroy: () => {
        for (const key of Object.keys(mocks.cookie)) delete mocks.cookie[key];
      },
    }),
}));
vi.mock("next-intl/server", () => ({
  getTranslations: async ({ namespace }: { namespace: string }) =>
    createTranslator({ locale: "en", messages, namespace: namespace as never }),
}));

const { checkAdminCode, sendAdminCode } = await import("./admin-code");

beforeEach(() => {
  vi.clearAllMocks();
  for (const key of Object.keys(mocks.cookie)) delete mocks.cookie[key];
});

/** Sends a code and returns it as the email shows it. */
async function sentCode(remember = true) {
  await sendAdminCode(remember);
  const mail = mocks.sendMail.mock.calls[0]![0];
  return mail.subject.match(/^\d{6}/)![0] as string;
}

describe("admin sign-in code", () => {
  it("emails a 6-digit code to the admin and stores only a hash tied to this browser", async () => {
    const code = await sentCode();
    const mail = mocks.sendMail.mock.calls[0]![0];
    expect(mail).toMatchObject({ to: "sara@example.com", sender: "noreply" });
    expect(mail.text).toContain(code);
    expect(mail.text).toContain("/admin/forgot");

    const stored = mocks.convexMutation.mock.calls[0]![1];
    expect(stored.subject).toBe("admin-code");
    expect(stored.tokenHash).not.toContain(code);
    const nonce = mocks.cookie.nonce as string;
    expect(stored.tokenHash).toBe(createHash("sha256").update(`${nonce}:${code}`).digest("hex"));
    expect(stored.expiresAt - Date.now()).toBeGreaterThan(9 * 60 * 1000);
  });

  it("accepts the code from this browser and ends the pending sign-in", async () => {
    const code = await sentCode(true);
    const expectedHash = mocks.convexMutation.mock.calls[0]![1].tokenHash;
    mocks.convexMutation.mockImplementation(async (_fn, args) => (args.tokenHash === expectedHash ? "ok" : "wrong"));

    expect(await checkAdminCode(` ${code.slice(0, 3)} ${code.slice(3)} `)).toEqual({ status: "ok", remember: true });
    expect(mocks.cookie.nonce).toBeUndefined();
  });

  it("keeps the step open for a wrong code, without asking the database about malformed input", async () => {
    await sentCode();
    mocks.convexMutation.mockReset();
    expect(await checkAdminCode("12ab")).toEqual({ status: "wrong" });
    expect(mocks.convexMutation).not.toHaveBeenCalled();

    mocks.convexMutation.mockResolvedValue("wrong");
    expect(await checkAdminCode("000000")).toEqual({ status: "wrong" });
    expect(mocks.cookie.nonce).toBeDefined();
  });

  it("refuses a code from a browser that never gave the password", async () => {
    expect(await checkAdminCode("123456")).toEqual({ status: "expired" });
    expect(mocks.convexMutation).not.toHaveBeenCalled();
  });

  it("refuses once the 10 minutes are over", async () => {
    await sentCode();
    mocks.cookie.until = Date.now() - 1;
    expect(await checkAdminCode("123456")).toEqual({ status: "expired" });
  });
});
