<script lang="ts">
	import { cn, type WithElementRef } from "@DashboardPT2/ui/lib/utils.js";
	import type { HTMLAttributes } from "svelte/elements";
	import { getProgressState } from "./context.svelte.js";

	let {
		ref = $bindable(null),
		class: className,
		children,
		...restProps
	}: WithElementRef<HTMLAttributes<HTMLSpanElement>> = $props();

	const progress = getProgressState();
	const percent = $derived(
		progress.value == null ? null : Math.round((100 * progress.value) / (progress.max || 1))
	);
</script>

<!-- Falls back to the percentage, which is what it shows at almost every call site. -->
<span
	bind:this={ref}
	data-slot="progress-value"
	class={cn("ml-auto text-xs text-muted-foreground tabular-nums", className)}
	{...restProps}
>
	{#if children}{@render children()}{:else if percent !== null}{percent}%{/if}
</span>
