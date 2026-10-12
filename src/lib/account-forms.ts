import { z } from "zod";

// Server-side checks for the sign-in, account and password forms (customers
// and admin). Errors are message keys (Account.errors.*), never shown raw.

export type AccountFieldError = "required" | "invalidEmail" | "tooLong" | "tooShort" | "mismatch";

export const MIN_PASSWORD = 8;
/** bcrypt only reads the first 72 bytes; longer passwords are refused rather than cut. */
const MAX_PASSWORD_BYTES = 72;

const required = (max: number) =>
  z.string().trim().min(1, { error: "required" }).max(max, { error: "tooLong" });

const email = required(254)
  .pipe(z.email({ error: "invalidEmail" }))
  .transform((value) => value.toLowerCase());

/** For signing in: any non-empty password (old ones may predate the rules). */
const currentPassword = z.string().min(1, { error: "required" }).max(1000, { error: "tooLong" });

const newPassword = z
  .string()
  .min(1, { error: "required" })
  .min(MIN_PASSWORD, { error: "tooShort" })
  .refine((value) => new TextEncoder().encode(value).length <= MAX_PASSWORD_BYTES, { error: "tooLong" });

const checkbox = z.preprocess((value) => value === "on" || value === "true", z.boolean());

export const accountSchemas = {
  signIn: z.object({ email, password: currentPassword, remember: checkbox }),
  createAccount: z.object({ firstName: required(100), email, password: newPassword, newsletter: checkbox }),
  forgotPassword: z.object({ email }),
  resetPassword: z
    .object({ token: required(200), password: newPassword, confirm: z.string() })
    .refine((value) => value.password === value.confirm, { error: "mismatch", path: ["confirm"] }),
  details: z.object({
    firstName: required(100),
    lastName: z.string().trim().max(100, { error: "tooLong" }),
    newsletter: checkbox,
  }),
  changePassword: z
    .object({ current: currentPassword, password: newPassword, confirm: z.string() })
    .refine((value) => value.password === value.confirm, { error: "mismatch", path: ["confirm"] }),
};

export type AccountForm = keyof typeof accountSchemas;
export type AccountInput<F extends AccountForm> = z.infer<(typeof accountSchemas)[F]>;
export type AccountFieldErrors = Partial<Record<string, AccountFieldError>>;

/** Field names per form, so values can be echoed back (never passwords). */
const ECHOED: Record<AccountForm, string[]> = {
  signIn: ["email"],
  createAccount: ["firstName", "email"],
  forgotPassword: ["email"],
  resetPassword: [],
  details: ["firstName", "lastName"],
  changePassword: [],
};

const FIELDS: Record<AccountForm, string[]> = {
  signIn: ["email", "password", "remember"],
  createAccount: ["firstName", "email", "password", "newsletter"],
  forgotPassword: ["email"],
  resetPassword: ["token", "password", "confirm"],
  details: ["firstName", "lastName", "newsletter"],
  changePassword: ["current", "password", "confirm"],
};

export type ParsedAccountForm<F extends AccountForm> =
  | { success: true; data: AccountInput<F>; values: Record<string, string> }
  | { success: false; fieldErrors: AccountFieldErrors; values: Record<string, string> };

export function parseAccountForm<F extends AccountForm>(form: F, data: FormData): ParsedAccountForm<F> {
  const raw: Record<string, string> = {};
  for (const field of FIELDS[form]) {
    const value = data.get(field);
    if (typeof value === "string") raw[field] = value;
  }
  const values = Object.fromEntries(ECHOED[form].map((field) => [field, raw[field] ?? ""]));
  const result = accountSchemas[form].safeParse(raw);
  if (result.success) return { success: true, data: result.data as AccountInput<F>, values };

  const fieldErrors: AccountFieldErrors = {};
  for (const issue of result.error.issues) {
    const field = String(issue.path[0] ?? "");
    const key = issue.message as AccountFieldError;
    fieldErrors[field] ??= ["required", "invalidEmail", "tooLong", "tooShort", "mismatch"].includes(key) ? key : "required";
  }
  return { success: false, fieldErrors, values };
}
