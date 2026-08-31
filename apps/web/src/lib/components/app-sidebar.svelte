<script lang="ts">
	import { cn } from "@DashboardPT2/ui/lib/utils";

	import AppNav from "./app-nav.svelte";
	import { BRAND_NAME } from "./brand";
	import BrandMark from "./brand-mark.svelte";

	let { collapsed }: { collapsed: boolean } = $props();
</script>

<aside
	class={cn(
		"hidden shrink-0 flex-col bg-surface-shell transition-[width] duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] md:flex",
		collapsed ? "w-12" : "w-56",
	)}
>
	<div class="flex h-9 shrink-0 items-center overflow-hidden px-3">
		<BrandMark />
		{#if !collapsed}
			<span class="ml-2 truncate text-xs font-semibold tracking-tight">{BRAND_NAME}</span>
		{/if}
	</div>
	<div class="flex min-h-0 flex-1 flex-col overflow-hidden px-2 pb-2">
		<AppNav {collapsed} />
	</div>
</aside>
