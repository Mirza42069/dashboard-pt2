<script lang="ts">
	import { Pagination as PaginationPrimitive } from "bits-ui";
	import { ChevronLeft as ChevronLeftIcon } from "@DashboardPT2/ui/components/icons";
	import { buttonVariants } from "@DashboardPT2/ui/components/button/index.js";
	import { cn } from "@DashboardPT2/ui/lib/utils.js";

	let {
		ref = $bindable(null),
		class: className,
		...restProps
	}: PaginationPrimitive.PrevButtonProps = $props();
</script>

<PaginationPrimitive.PrevButton
	bind:ref
	aria-label="Go to previous page"
	class={cn(
		buttonVariants({ variant: "ghost", size: "default" }),
		"pl-1.5!",
		className
	)}
	{...restProps}
>
	<ChevronLeftIcon data-icon="inline-start" />
	<span class="cn-pagination-previous-text hidden sm:block">Previous</span>
</PaginationPrimitive.PrevButton>
