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
    // One more than the highest of this type, so wiping the table starts again at 1.
    const last = await ctx.db
      .query("inquiries")
      .withIndex("by_type_number", (q) => q.eq("type", inquiry.type))
      .order("desc")
      .first();
    const number = (last?.number ?? 0) + 1;
    const id = await ctx.db.insert("inquiries", { ...inquiry, number, emailed: false });
    return { id, number };
  },
});

/**
 * Deletes stored inquiries (test data before launch), which restarts the
 * numbering at 1. Removes up to 500 per call; run it again while it
 * returns done: false.
 */
export const clearAll = serverMutation({
  args: {},
  handler: async (ctx) => {
    const batch = await ctx.db.query("inquiries").take(500);
    for (const row of batch) await ctx.db.delete(row._id);
    return { deleted: batch.length, done: batch.length < 500 };
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
