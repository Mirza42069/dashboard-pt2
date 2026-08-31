<script lang="ts">
	import { cn, type WithElementRef } from "@DashboardPT2/ui/lib/utils.js";
	import type { HTMLAttributes } from "svelte/elements";

	let {
		ref = $bindable(null),
		class: className,
		children,
		...restProps
	}: WithElementRef<HTMLAttributes<HTMLSpanElement>> = $props();
</script>

<span bind:this={ref} data-slot="progress-label" class={cn("text-xs", className)} {...restProps}>
	{@render children?.()}
</span>
