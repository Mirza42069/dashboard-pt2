import type { AppRouterClient } from "@DashboardPT2/api/routers/index";
import { browser } from "$app/environment";
import { createORPCClient } from "@orpc/client";
import { RPCLink } from "@orpc/client/fetch";
import { createTanstackQueryUtils } from "@orpc/tanstack-query";
import { QueryCache, QueryClient } from "@tanstack/svelte-query";

function createAppQueryClient() {
  return new QueryClient({
    queryCache: new QueryCache({
      onError: (error) => {
        console.error(`Error: ${error.message}`);
      },
    }),
  });
}

/**
 * One client per browser tab; a fresh one per server render.
 *
 * This used to be a single module-scope QueryClient, which is correct in the
 * browser and wrong on the server. Module scope there is the *process*, shared
 * by every request it handles, so a cache entry written while rendering one
 * user's page was still there when the next user's page rendered — and query
 * keys like ["coretax","rows",id] carry no tenant, so nothing made the second
 * render miss. That is a cross-request data leak, and it also silently defeats
 * `initialData`: a page load handing fresh rows to a query whose key is already
 * in the cache renders the cached ones instead.
 *
 * In the browser the singleton is what we want, and keeping it is what lets the
 * cache survive client-side navigation.
 */
const browserQueryClient = browser ? createAppQueryClient() : null;

export function getQueryClient() {
  return browserQueryClient ?? createAppQueryClient();
}

export const link = new RPCLink({
  url: () => {
    if (typeof window === "undefined") {
      throw new Error("This link is not allowed on the server side.");
    }

    return `${window.location.origin}/rpc`;
  },
  fetch(url, options) {
    return fetch(url, {
      ...options,
      credentials: "include",
    });
  },
});

export const client: AppRouterClient = globalThis.$client ?? createORPCClient(link);

export const orpc = createTanstackQueryUtils(client);
