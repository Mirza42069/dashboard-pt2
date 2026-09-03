<script lang="ts">
	import { Icon, ChevronRightIcon } from "@DashboardPT2/ui/components/icons";
	import { cn, type WithElementRef } from "@DashboardPT2/ui/lib/utils.js";
	import type { HTMLLiAttributes } from "svelte/elements";

	let {
		ref = $bindable(null),
		class: className,
		children,
		...restProps
	}: WithElementRef<HTMLLiAttributes> = $props();
</script>

<li
	bind:this={ref}
	data-slot="breadcrumb-separator"
	role="presentation"
	aria-hidden="true"
	class={cn("[&>svg]:size-3.5", className)}
	{...restProps}
>
	{#if children}
		{@render children?.()}
	{:else}
		<Icon icon={ChevronRightIcon} />
	{/if}
</li>
