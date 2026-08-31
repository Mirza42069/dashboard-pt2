<script lang="ts">
	import { cn, type WithElementRef } from "@DashboardPT2/ui/lib/utils.js";
	import type { HTMLAttributes } from "svelte/elements";
	import { getProgressState } from "./context.svelte.js";

	let {
		ref = $bindable(null),
		class: className,
		...restProps
	}: WithElementRef<HTMLAttributes<HTMLDivElement>> = $props();

	const progress = getProgressState();
	// A null value is an indeterminate bar, which reads as empty rather than full.
	const percent = $derived(
		progress.value == null ? 0 : (100 * progress.value) / (progress.max || 1)
	);
</script>

<div
	bind:this={ref}
	data-slot="progress-indicator"
	class={cn("h-full w-full flex-1 bg-primary transition-all", className)}
	style="transform: translateX(-{100 - percent}%)"
	{...restProps}
></div>
