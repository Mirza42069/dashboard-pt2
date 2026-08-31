import { getRequestEvent } from "$app/server";
import { createContext } from "@DashboardPT2/api/context";
import { appRouter, type AppRouterClient } from "@DashboardPT2/api/routers/index";
import { createRouterClient } from "@orpc/server";

if (typeof window !== "undefined") {
  throw new Error("This file should only be imported on the server.");
}

export const serverClient: AppRouterClient = createRouterClient(appRouter, {
  context: async () => {
    const event = getRequestEvent();
    return createContext({
      headers: event.request.headers,
    });
  },
});

// oRPC's SvelteKit SSR setup loads this from hooks.server.ts so $lib/orpc can
// reuse the in-process server client during SSR and fall back to HTTP in the browser.
globalThis.$client = serverClient;
