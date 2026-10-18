/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as adminCredentials from "../adminCredentials.js";
import type * as artworks from "../artworks.js";
import type * as cleanup from "../cleanup.js";
import type * as crons from "../crons.js";
import type * as customers from "../customers.js";
import type * as files from "../files.js";
import type * as guard from "../guard.js";
import type * as inquiries from "../inquiries.js";
import type * as pages from "../pages.js";
import type * as passwordResets from "../passwordResets.js";
import type * as rateLimits from "../rateLimits.js";
import type * as settings from "../settings.js";
import type * as storage from "../storage.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  adminCredentials: typeof adminCredentials;
  artworks: typeof artworks;
  cleanup: typeof cleanup;
  crons: typeof crons;
  customers: typeof customers;
  files: typeof files;
  guard: typeof guard;
  inquiries: typeof inquiries;
  pages: typeof pages;
  passwordResets: typeof passwordResets;
  rateLimits: typeof rateLimits;
  settings: typeof settings;
  storage: typeof storage;
}>;

/**
 * A utility for referencing Convex functions in your app's public API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;

/**
 * A utility for referencing Convex functions in your app's internal API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = internal.myModule.myFunction;
 * ```
 */
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;

export declare const components: {};
