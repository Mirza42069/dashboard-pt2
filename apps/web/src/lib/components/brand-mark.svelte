<script lang="ts">
	import { cn } from "@DashboardPT2/ui/lib/utils";

	import { BRAND_NAME } from "./brand";

	let { size = "sm", class: className }: { size?: "sm" | "lg"; class?: string } = $props();
</script>

<!-- A compact ledger monogram: ruled entries meeting a strong closing balance. -->
<span
	role="img"
	aria-label={BRAND_NAME}
	class={cn("inline-flex shrink-0", size === "lg" ? "size-10" : "size-6", className)}
>
	<svg viewBox="0 0 48 48" class="size-full text-brand" aria-hidden="true">
		<rect width="48" height="48" rx="11" fill="currentColor" />
		<path d="M14 12v24h20" fill="none" stroke="white" stroke-width="4" stroke-linecap="round" />
		<path d="M21 16h13M21 24h13M21 32h13" fill="none" stroke="white" stroke-width="3" stroke-linecap="round" opacity=".88" />
	</svg>
</span>
