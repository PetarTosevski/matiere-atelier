import "server-only";
import type { Id } from "../../convex/_generated/dataModel";
import { api, convexMutation, isConvexConfigured } from "@/lib/convex";
import type { InquiryType } from "@/lib/types";

// Stores inquiries in Convex as well as emailing them. Without Convex
// (development), nothing is stored and the .outbox/ copy is the only record.

type Validated = { name: string; email: string } & Record<string, unknown>;

export async function recordInquiry(
  type: InquiryType,
  data: Validated,
): Promise<Id<"inquiries"> | null> {
  if (!isConvexConfigured()) return null;
  const { name, email, ...rest } = data;
  const details: Record<string, string | string[]> = {};
  for (const [key, value] of Object.entries(rest)) {
    if (typeof value === "string") details[key] = value;
    else if (Array.isArray(value)) details[key] = value.map(String);
  }
  return convexMutation(api.inquiries.record, { type, name, email, details });
}

export async function markInquiryEmailed(id: Id<"inquiries">): Promise<void> {
  await convexMutation(api.inquiries.markEmailed, { id });
}
