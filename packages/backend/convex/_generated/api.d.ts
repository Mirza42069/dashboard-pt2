/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as auth from "../auth.js";
import type * as crons from "../crons.js";
import type * as dashboard from "../dashboard.js";
import type * as domain from "../domain.js";
import type * as expenses from "../expenses.js";
import type * as healthCheck from "../healthCheck.js";
import type * as http from "../http.js";
import type * as invoices from "../invoices.js";
import type * as leases from "../leases.js";
import type * as maintenance from "../maintenance.js";
import type * as organizations from "../organizations.js";
import type * as paymentRules from "../paymentRules.js";
import type * as payments from "../payments.js";
import type * as properties from "../properties.js";
import type * as publicPayments from "../publicPayments.js";
import type * as rooms from "../rooms.js";
import type * as seed from "../seed.js";
import type * as tenants from "../tenants.js";
import type * as webhooks from "../webhooks.js";
import type * as xenditAccounts from "../xenditAccounts.js";
import type * as xenditClient from "../xenditClient.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  auth: typeof auth;
  crons: typeof crons;
  dashboard: typeof dashboard;
  domain: typeof domain;
  expenses: typeof expenses;
  healthCheck: typeof healthCheck;
  http: typeof http;
  invoices: typeof invoices;
  leases: typeof leases;
  maintenance: typeof maintenance;
  organizations: typeof organizations;
  paymentRules: typeof paymentRules;
  payments: typeof payments;
  properties: typeof properties;
  publicPayments: typeof publicPayments;
  rooms: typeof rooms;
  seed: typeof seed;
  tenants: typeof tenants;
  webhooks: typeof webhooks;
  xenditAccounts: typeof xenditAccounts;
  xenditClient: typeof xenditClient;
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

export declare const components: {
  betterAuth: import("@convex-dev/better-auth/_generated/component.js").ComponentApi<"betterAuth">;
};
