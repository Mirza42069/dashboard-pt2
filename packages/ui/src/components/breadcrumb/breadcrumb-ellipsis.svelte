<script lang="ts">
	import { Icon, MoreHorizontal as MoreHorizontalIcon } from "@DashboardPT2/ui/components/icons";
	import { cn, type WithElementRef, type WithoutChildren } from "@DashboardPT2/ui/lib/utils.js";
	import type { HTMLAttributes } from "svelte/elements";

	let {
		ref = $bindable(null),
		class: className,
		...restProps
	}: WithoutChildren<WithElementRef<HTMLAttributes<HTMLSpanElement>>> = $props();
</script>

<span
	bind:this={ref}
	data-slot="breadcrumb-ellipsis"
	role="presentation"
	aria-hidden="true"
	class={cn("size-5 [&>svg]:size-4 flex items-center justify-center", className)}
	{...restProps}
>
	<Icon icon={MoreHorizontalIcon} />
	<span class="sr-only">More</span>
</span>
