import { v } from "convex/values";
import { serverMutation } from "./guard";
import { inquiryTypeValidator } from "./schema";

// Every inquiry is stored as well as emailed, so nothing is lost if the email
// fails. Validation happens in Next.js (lib/inquiry.ts) before this is called.

export const record = serverMutation({
  args: {
    type: inquiryTypeValidator,
    name: v.string(),
    email: v.string(),
    details: v.record(v.string(), v.union(v.string(), v.array(v.string()))),
  },
  handler: async (ctx, inquiry) => {
    return ctx.db.insert("inquiries", { ...inquiry, emailed: false });
  },
});

export const markEmailed = serverMutation({
  args: { id: v.id("inquiries") },
  handler: async (ctx, { id }) => {
    await ctx.db.patch(id, { emailed: true });
  },
});
