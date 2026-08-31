import adapterAuto from "@sveltejs/adapter-auto";
import adapterVercel from "@sveltejs/adapter-vercel";
import { vitePreprocess } from "@sveltejs/vite-plugin-svelte";

/** @type {import('@sveltejs/kit').Config} */
const config = {
  // Consult https://svelte.dev/docs/kit/integrations
  // for more information about preprocessors
  preprocess: vitePreprocess(),

  kit: {
    adapter: process.env.VERCEL
      ? adapterVercel({ regions: ["sin1"] })
      : adapterAuto(),

    // The shared UI package is consumed as source, not as a built artifact —
    // same as every other @DashboardPT2/* package. Aliasing straight at its
    // src/ means Vite compiles its .svelte files as ordinary project files
    // rather than having to treat node_modules as a Svelte library, and it
    // keeps the import specifiers identical to the React template's
    // (`@DashboardPT2/ui/components/button`), so ported files need no rewriting.
    alias: {
      "@DashboardPT2/ui": "../../packages/ui/src",
      "@DashboardPT2/ui/*": "../../packages/ui/src/*",
    },
  },
};

export default config;
