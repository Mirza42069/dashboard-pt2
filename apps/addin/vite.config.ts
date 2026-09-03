import { svelte } from "@sveltejs/vite-plugin-svelte";
import tailwindcss from "@tailwindcss/vite";
import { getHttpsServerOptions } from "office-addin-dev-certs";
import path from "node:path";
import { defineConfig } from "vite";

const uiSrc = path.resolve(import.meta.dirname, "../../packages/ui/src");

export default defineConfig(async () => {
  // Only the actual dev/preview servers need the certificate — loading the
  // helper anywhere else (svelte-check, vite build) would generate
  // certificates and attempt a CA install as a side effect.
  const isDevServer = ["dev", "preview"].includes(process.env.npm_lifecycle_event ?? "");

  // Office loads taskpanes over HTTPS only, even from localhost — sideloading
  // against a plain http dev server is refused by the webview. The dev-certs
  // helper provides a trusted localhost certificate; if it is not installed
  // yet we fall back to http so the browser preview mode still runs.
  let https;
  if (isDevServer) {
    try {
      https = await getHttpsServerOptions();
    } catch {
      https = undefined;
    }
  }

  return {
    plugins: [tailwindcss(), svelte()],
    /*
     * The add-in is a pure client SPA — nothing ever runs in Vite's ssr
     * environment. vite-plugin-svelte still forces `svelte/*` into that
     * environment's dep optimizer, and Vite 8's rolldown ssr prebundle dies
     * on startup with "Could not resolve 'node:module' in
     * \0rolldown/runtime.js" (rolldown's resolver can't match a builtin from
     * its virtual runtime module). The client optimizer is unaffected, so
     * disable the unused one.
     */
    environments: {
      ssr: {
        optimizeDeps: {
          noDiscovery: true,
          include: [],
          exclude: ["svelte"],
        },
      },
    },
    resolve: {
      alias: [
        { find: /^@DashboardPT2\/ui$/, replacement: uiSrc },
        { find: /^@DashboardPT2\/ui\/(.*)$/, replacement: `${uiSrc}/$1` },
      ],
    },
    server: {
      port: 5174,
      strictPort: true,
      https,
    },
    preview: {
      port: 5174,
      strictPort: true,
      https,
    },
  };
});
