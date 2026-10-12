import { describe, expect, it } from "vitest";
import { parseAccountForm } from "./account-forms";

const form = (entries: Record<string, string>) => {
  const data = new FormData();
  for (const [key, value] of Object.entries(entries)) data.set(key, value);
  return data;
};

describe("parseAccountForm", () => {
  it("lowercases emails and reads checkboxes", () => {
    const result = parseAccountForm("signIn", form({ email: " Ana@Example.COM ", password: "x", remember: "on" }));
    expect(result).toMatchObject({ success: true, data: { email: "ana@example.com", password: "x", remember: true } });
  });

  it("treats a missing checkbox as off", () => {
    const result = parseAccountForm("createAccount", form({ firstName: "Ana", email: "a@b.co", password: "12345678" }));
    expect(result).toMatchObject({ success: true, data: { newsletter: false } });
  });

  it("names each problem field", () => {
    const result = parseAccountForm("createAccount", form({ firstName: " ", email: "nope", password: "short" }));
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.fieldErrors).toEqual({ firstName: "required", email: "invalidEmail", password: "tooShort" });
    }
  });

  it("refuses passwords bcrypt would cut short", () => {
    const result = parseAccountForm("createAccount", form({ firstName: "A", email: "a@b.co", password: "é".repeat(37) }));
    expect(result).toMatchObject({ success: false, fieldErrors: { password: "tooLong" } });
  });

  it("checks that the new password was typed twice the same", () => {
    const result = parseAccountForm("resetPassword", form({ token: "t", password: "12345678", confirm: "12345679" }));
    expect(result).toMatchObject({ success: false, fieldErrors: { confirm: "mismatch" } });
  });

  it("never echoes passwords back", () => {
    const result = parseAccountForm("signIn", form({ email: "a@b.co", password: "" }));
    expect(result.values).toEqual({ email: "a@b.co" });
  });

  it("asks for the password before deleting an account", () => {
    expect(parseAccountForm("deleteAccount", form({ password: "" })).success).toBe(false);
    const result = parseAccountForm("deleteAccount", form({ password: "any old one" }));
    expect(result.success && result.data.password).toBe("any old one");
    expect(result.values).toEqual({});
  });
});
