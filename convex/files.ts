import { serverMutation } from "./guard";

/** A short-lived URL the Next.js server POSTs a processed image to. */
export const generateUploadUrl = serverMutation({
  args: {},
  handler: async (ctx) => ctx.storage.generateUploadUrl(),
});
