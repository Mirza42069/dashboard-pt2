<script lang="ts">
	import { ChevronLeft as ChevronLeftIcon } from "@DashboardPT2/ui/components/icons";
	import { Calendar as CalendarPrimitive } from "bits-ui";
	import { buttonVariants, type ButtonVariant } from "@DashboardPT2/ui/components/button/index.js";
	import { cn } from "@DashboardPT2/ui/lib/utils.js";

	let {
		ref = $bindable(null),
		class: className,
		children,
		variant = "ghost",
		...restProps
	}: CalendarPrimitive.PrevButtonProps & {
		variant?: ButtonVariant;
	} = $props();
</script>

{#snippet Fallback()}
	<ChevronLeftIcon class={cn("size-4", className)} />
{/snippet}

<CalendarPrimitive.PrevButton
	bind:ref
	class={cn(
		buttonVariants({ variant }),
		"size-(--cell-size) bg-transparent p-0 select-none disabled:opacity-50 rtl:rotate-180",
		className
	)}
	{...restProps}
>
	{#if children}
		{@render children?.()}
	{:else}
		{@render Fallback()}
	{/if}
</CalendarPrimitive.PrevButton>
