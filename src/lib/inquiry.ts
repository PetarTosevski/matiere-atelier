import { z } from "zod";
import { MAX_CART_ITEMS } from "@/lib/cart";
import type { InquiryType } from "@/lib/types";

// Server-side validation for every inquiry form. Error messages are message
// keys (Form.errors.*), translated by the form, never shown raw.

export type FieldErrorKey = "required" | "invalidEmail" | "noMailDomain" | "tooLong";

const required = (max: number) =>
  z
    .string()
    .trim()
    .min(1, { error: "required" })
    .max(max, { error: "tooLong" });

const optional = (max: number) =>
  z.string().trim().max(max, { error: "tooLong" });

const name = required(100);
const email = required(254).pipe(z.email({ error: "invalidEmail" }));

export const inquirySchemas = {
  CONTACT: z.object({ name, email, message: required(5000) }),
  COMMISSION: z.object({
    name,
    email,
    description: required(5000),
    size: required(200),
    budget: optional(200),
  }),
  REQUEST: z.object({
    name,
    email,
    message: required(5000),
    artworkSlug: required(200),
  }),
  ORDER: z.object({
    name,
    email,
    message: optional(5000),
    artworkIds: z.array(z.string().min(1).max(64)).min(1).max(MAX_CART_ITEMS),
  }),
} satisfies Record<InquiryType, z.ZodType>;

export type InquiryInput<T extends InquiryType> = z.infer<
  (typeof inquirySchemas)[T]
>;

export const inquiryTypeSchema = z.enum([
  "CONTACT",
  "COMMISSION",
  "REQUEST",
  "ORDER",
]);

/** The text fields each form shows, in order. */
export const inquiryFields = {
  CONTACT: ["name", "email", "message"],
  COMMISSION: ["name", "email", "description", "size", "budget"],
  REQUEST: ["name", "email", "message"],
  ORDER: ["name", "email", "message"],
} as const satisfies Record<InquiryType, readonly string[]>;

export type InquiryField = (typeof inquiryFields)[InquiryType][number];

/** The honeypot field: hidden from people, often filled in by bots. */
export const HONEYPOT_FIELD = "company";

/** Reads a form submission into the shape its schema expects. */
export function readInquiryForm(type: InquiryType, form: FormData) {
  const text = (key: string) => {
    const value = form.get(key);
    return typeof value === "string" ? value : "";
  };
  const values: Record<string, unknown> = {};
  for (const field of inquiryFields[type]) values[field] = text(field);
  if (type === "REQUEST") values.artworkSlug = text("artworkSlug");
  if (type === "ORDER") {
    values.artworkIds = form
      .getAll("artworkIds")
      .filter((id): id is string => typeof id === "string");
  }
  return values;
}

/** Validates a submission; returns data or one error key per field. */
export function validateInquiry<T extends InquiryType>(
  type: T,
  values: Record<string, unknown>,
):
  | { success: true; data: InquiryInput<T> }
  | { success: false; fieldErrors: Partial<Record<string, FieldErrorKey>> } {
  const result = inquirySchemas[type].safeParse(values);
  if (result.success) {
    return { success: true, data: result.data as InquiryInput<T> };
  }

  const fieldErrors: Partial<Record<string, FieldErrorKey>> = {};
  for (const issue of result.error.issues) {
    const field = String(issue.path[0] ?? "form");
    if (fieldErrors[field]) continue;
    const key = issue.message as FieldErrorKey;
    fieldErrors[field] =
      key === "invalidEmail" || key === "tooLong" ? key : "required";
  }
  return { success: false, fieldErrors };
}
