<script lang="ts">
	import { cn, type WithElementRef } from "@DashboardPT2/ui/lib/utils.js";
	import type { HTMLAttributes } from "svelte/elements";

	let {
		ref = $bindable(null),
		class: className,
		children,
		...restProps
	}: WithElementRef<HTMLAttributes<HTMLDivElement>> = $props();
</script>

<div
	bind:this={ref}
	data-slot="progress-track"
	class={cn("relative flex h-1 w-full items-center overflow-x-hidden rounded-md bg-muted", className)}
	{...restProps}
>
	{@render children?.()}
</div>
