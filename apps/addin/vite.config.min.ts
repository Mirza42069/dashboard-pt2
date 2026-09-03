import { svelte } from "@sveltejs/vite-plugin-svelte";
import path from "node:path";
import { defineConfig } from "vite";

const uiSrc = path.resolve(import.meta.dirname, "../../packages/ui/src");
const dep = process.env.OPT_DEP ?? "svelte";

export default defineConfig({
	plugins: [svelte()],
	resolve: {
		alias: [
			{ find: /^@DashboardPT2\/ui$/, replacement: uiSrc },
			{ find: /^@DashboardPT2\/ui\/(.*)$/, replacement: `${uiSrc}/$1` },
		],
	},
	optimizeDeps: { force: true },
	environments: {
		ssr: { optimizeDeps: { disabled: true } },
	},
});




