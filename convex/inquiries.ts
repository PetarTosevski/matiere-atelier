import { v } from "convex/values";
import { serverMutation, serverQuery } from "./guard";
import { inquiryTypeValidator, orderItemValidator } from "./schema";

// Every inquiry is stored as well as emailed, so nothing is lost if the email
// fails. Validation happens in Next.js (lib/inquiry.ts) before this is called.

export const record = serverMutation({
  args: {
    type: inquiryTypeValidator,
    name: v.string(),
    email: v.string(),
    details: v.record(v.string(), v.union(v.string(), v.array(v.string()))),
    customerId: v.optional(v.id("customers")),
    items: v.optional(v.array(orderItemValidator)),
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

/** A customer's orders, newest first (for My Collection). */
export const ordersForCustomer = serverQuery({
  args: { customerId: v.id("customers") },
  handler: async (ctx, { customerId }) => {
    const rows = await ctx.db
      .query("inquiries")
      .withIndex("by_customer", (q) => q.eq("customerId", customerId))
      .order("desc")
      .collect();
    return rows
      .filter((row) => row.type === "ORDER")
      .map((row) => ({ id: row._id, createdAt: row._creationTime, items: row.items ?? [] }));
  },
});
