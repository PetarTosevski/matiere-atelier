import { ConvexError, v, type ObjectType, type PropertyValidators } from "convex/values";
import {
  action,
  mutation,
  query,
  type ActionCtx,
  type MutationCtx,
  type QueryCtx,
} from "./_generated/server";

// A Convex deployment URL can be called by anyone, and these functions return
// hidden prices and drafts. So every function takes a `secret` that only the
// Next.js server knows, and refuses to run without it. Never export a plain
// query/mutation/action from this folder; use these wrappers.

/** Compares without leaking where the strings differ. */
export function secretsMatch(given: string, expected: string): boolean {
  let diff = given.length ^ expected.length;
  for (let i = 0; i < Math.max(given.length, expected.length); i++) {
    diff |= (given.charCodeAt(i) || 0) ^ (expected.charCodeAt(i) || 0);
  }
  return diff === 0;
}

export function requireSecret(secret: string) {
  const expected = process.env.CONVEX_SERVER_SECRET;
  if (!expected || expected.length < 32 || !secretsMatch(secret, expected)) {
    throw new ConvexError("Unauthorized");
  }
}

const secretArg = { secret: v.string() };

export function serverQuery<Args extends PropertyValidators, Result>(definition: {
  args: Args;
  handler: (ctx: QueryCtx, args: ObjectType<Args>) => Promise<Result>;
}) {
  return query({
    args: { ...definition.args, ...secretArg },
    handler: async (ctx, allArgs) => {
      const { secret, ...args } = allArgs as ObjectType<Args> & { secret: string };
      requireSecret(secret);
      return definition.handler(ctx as QueryCtx, args as unknown as ObjectType<Args>);
    },
  });
}

export function serverMutation<Args extends PropertyValidators, Result>(definition: {
  args: Args;
  handler: (ctx: MutationCtx, args: ObjectType<Args>) => Promise<Result>;
}) {
  return mutation({
    args: { ...definition.args, ...secretArg },
    handler: async (ctx, allArgs) => {
      const { secret, ...args } = allArgs as ObjectType<Args> & { secret: string };
      requireSecret(secret);
      return definition.handler(ctx as MutationCtx, args as unknown as ObjectType<Args>);
    },
  });
}

export function serverAction<Args extends PropertyValidators, Result>(definition: {
  args: Args;
  handler: (ctx: ActionCtx, args: ObjectType<Args>) => Promise<Result>;
}) {
  return action({
    args: { ...definition.args, ...secretArg },
    handler: async (ctx, allArgs) => {
      const { secret, ...args } = allArgs as ObjectType<Args> & { secret: string };
      requireSecret(secret);
      return definition.handler(ctx as ActionCtx, args as unknown as ObjectType<Args>);
    },
  });
}
