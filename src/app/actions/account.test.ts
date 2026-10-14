import { createTranslator } from "next-intl";
import { beforeEach, describe, expect, it, vi } from "vitest";
import messages from "../../../messages/en.json";
import { createAccountAction, deleteAccountAction, signInAction, verifyEmailAction, type SignInState } from "./account";

// Email verification: new accounts get a link instead of a session, unconfirmed
// accounts can't sign in, and the link confirms and signs in.

const mocks = vi.hoisted(() => ({
  convexQuery: vi.fn(),
  convexMutation: vi.fn(),
  sendMail: vi.fn(),
  signInCustomer: vi.fn(),
  createResetToken: vi.fn(),
  consumeResetToken: vi.fn(),
  checkPassword: vi.fn(),
  getCustomer: vi.fn(),
  acceptsMail: true,
  human: true,
}));

vi.mock("@/lib/turnstile", () => ({ verifyTurnstile: async () => mocks.human }));
vi.mock("@/lib/email-domain", () => ({ domainAcceptsMail: async () => mocks.acceptsMail }));

vi.mock("@/lib/convex", () => ({
  api: {
    customers: {
      getByEmail: "getByEmail",
      create: "create",
      markVerified: "markVerified",
      getPasswordHash: "getPasswordHash",
      remove: "remove",
    },
  },
  convexQuery: mocks.convexQuery,
  convexMutation: mocks.convexMutation,
}));
vi.mock("@/lib/customer-auth", () => ({
  areAccountsAvailable: () => true,
  getCustomer: mocks.getCustomer,
  isCustomerSessionRemembered: async () => false,
  renewCustomerSession: async () => {},
  signInCustomer: mocks.signInCustomer,
  signOutCustomer: async () => {},
  updateCustomerSessionVersion: async () => {},
}));
vi.mock("@/lib/admin-account", () => ({
  isAdminEmail: () => false,
  changeAdminPassword: vi.fn(),
  sendAdminResetEmail: vi.fn(),
  signInAsAdmin: vi.fn(),
  signOutEverywhere: vi.fn(),
}));
vi.mock("@/lib/auth", () => ({ verifyCredentials: vi.fn() }));
vi.mock("@/lib/mail", () => ({ sendMail: mocks.sendMail }));
vi.mock("@/lib/password", () => ({
  VERIFY_LINK_MS: 86_400_000,
  hashPassword: async () => "hash",
  checkPassword: mocks.checkPassword,
  burnPasswordCheck: async () => {},
}));
vi.mock("@/lib/password-reset", () => ({
  createResetToken: mocks.createResetToken,
  consumeResetToken: mocks.consumeResetToken,
}));
vi.mock("@/lib/rate-limit", () => ({ rateLimit: async () => true }));
vi.mock("next/headers", () => ({ headers: async () => new Headers() }));
vi.mock("next/navigation", () => ({
  redirect: (url: string) => {
    throw new Error(`redirect:${url}`);
  },
}));
vi.mock("next-intl/server", () => ({
  getTranslations: async ({ namespace }: { namespace: string }) =>
    createTranslator({ locale: "en", messages, namespace: namespace as never }),
}));

const idle: SignInState = { status: "idle" };

function form(entries: Record<string, string>) {
  const data = new FormData();
  for (const [key, value] of Object.entries(entries)) data.set(key, value);
  return data;
}

beforeEach(() => {
  vi.clearAllMocks();
  mocks.createResetToken.mockResolvedValue("tok");
  mocks.sendMail.mockResolvedValue(undefined);
  mocks.checkPassword.mockResolvedValue(true);
  mocks.getCustomer.mockResolvedValue(null);
  mocks.acceptsMail = true;
  mocks.human = true;
});

describe("createAccountAction", () => {
  it("sends a verification link from noreply instead of signing in", async () => {
    mocks.convexMutation.mockResolvedValue("c1");
    const state = await createAccountAction(
      idle,
      form({ locale: "en", firstName: "Ana", email: "Ana@Example.com", password: "12345678" }),
    );
    expect(state).toEqual({ status: "verifySent", email: "ana@example.com", resent: false });
    expect(mocks.signInCustomer).not.toHaveBeenCalled();
    expect(mocks.createResetToken).toHaveBeenCalledWith("verify:c1", 86_400_000);
    const mail = mocks.sendMail.mock.calls[0]![0];
    expect(mail).toMatchObject({ to: "ana@example.com", sender: "noreply", toVisitor: true });
    expect(mail.text).toContain("/en/account/verify?token=tok");
  });

  it("refuses a form that fails the bot check, before making the account", async () => {
    mocks.human = false;
    const state = await createAccountAction(
      idle,
      form({ locale: "en", firstName: "Ana", email: "ana@example.com", password: "12345678" }),
    );
    expect(state).toMatchObject({ status: "error", error: "botCheck" });
    expect(mocks.convexMutation).not.toHaveBeenCalled();
  });

  it("refuses an address whose domain takes no mail, before making the account", async () => {
    mocks.acceptsMail = false;
    const state = await createAccountAction(
      idle,
      form({ locale: "en", firstName: "Ana", email: "ana@example.con", password: "12345678" }),
    );
    expect(state).toMatchObject({ status: "error", error: "invalid", fieldErrors: { email: "noMailDomain" } });
    expect(mocks.convexMutation).not.toHaveBeenCalled();
    expect(mocks.sendMail).not.toHaveBeenCalled();
  });

  it("refuses an email that has a confirmed account", async () => {
    mocks.convexMutation.mockResolvedValue(null);
    const state = await createAccountAction(
      idle,
      form({ locale: "en", firstName: "Ana", email: "ana@example.com", password: "12345678" }),
    );
    expect(state).toMatchObject({ status: "error", error: "emailTaken" });
    expect(mocks.sendMail).not.toHaveBeenCalled();
  });
});

describe("signInAction", () => {
  const account = { _id: "c1", email: "ana@example.com", firstName: "Ana", lastName: "", passwordHash: "h", sessionVersion: 1 };

  it("sends a new link instead of signing in an unconfirmed account", async () => {
    mocks.convexQuery.mockResolvedValue({ ...account, emailVerified: false });
    const state = await signInAction(idle, form({ locale: "en", email: "ana@example.com", password: "pw" }));
    expect(state).toEqual({ status: "verifySent", email: "ana@example.com", resent: true });
    expect(mocks.signInCustomer).not.toHaveBeenCalled();
    expect(mocks.sendMail).toHaveBeenCalledOnce();
  });

  it("says nothing about confirmation when the password is wrong", async () => {
    mocks.convexQuery.mockResolvedValue({ ...account, emailVerified: false });
    mocks.checkPassword.mockResolvedValue(false);
    const state = await signInAction(idle, form({ locale: "en", email: "ana@example.com", password: "nope" }));
    expect(state).toMatchObject({ status: "error", error: "wrongPassword" });
    expect(mocks.sendMail).not.toHaveBeenCalled();
  });

  it("signs in a confirmed account", async () => {
    mocks.convexQuery.mockResolvedValue({ ...account, emailVerified: true });
    const state = await signInAction(idle, form({ locale: "en", email: "ana@example.com", password: "pw" }));
    expect(state).toMatchObject({ status: "signedIn", email: "ana@example.com" });
    expect(mocks.signInCustomer).toHaveBeenCalledWith("c1", 1, false);
  });
});

describe("verifyEmailAction", () => {
  it("confirms the address, signs in and goes to the welcome", async () => {
    mocks.consumeResetToken.mockResolvedValue("verify:c1");
    mocks.convexMutation.mockResolvedValue({ sessionVersion: 2 });
    await expect(verifyEmailAction({}, form({ locale: "en", token: "tok" }))).rejects.toThrow(
      "redirect:/en/login?verified=done",
    );
    expect(mocks.convexMutation).toHaveBeenCalledWith("markVerified", { id: "c1" });
    expect(mocks.signInCustomer).toHaveBeenCalledWith("c1", 2, true);
  });

  it("refuses a password reset token or an expired link", async () => {
    for (const subject of ["customer:c1", null]) {
      mocks.consumeResetToken.mockResolvedValue(subject);
      expect(await verifyEmailAction({}, form({ locale: "en", token: "tok" }))).toEqual({ error: "expired" });
    }
    expect(mocks.signInCustomer).not.toHaveBeenCalled();
  });
});

describe("deleteAccountAction", () => {
  it("deletes the account and confirms it from noreply", async () => {
    mocks.getCustomer.mockResolvedValue({ id: "c1", email: "ana@example.com", firstName: "Ana", lastName: "", newsletter: false });
    mocks.convexQuery.mockResolvedValue("hash");
    await expect(deleteAccountAction({ status: "idle" }, form({ locale: "en", password: "pw" }))).rejects.toThrow(
      "redirect:/en/login?deleted=done",
    );
    expect(mocks.convexMutation).toHaveBeenCalledWith("remove", { id: "c1" });
    expect(mocks.sendMail.mock.calls[0]![0]).toMatchObject({
      to: "ana@example.com",
      subject: "Your account has been deleted · Matière Atelier",
      sender: "noreply",
    });
  });
});
