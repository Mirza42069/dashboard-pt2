<script lang="ts">
	import { Icon, ChevronUpIcon } from "@DashboardPT2/ui/components/icons";
	import { Select as SelectPrimitive } from "bits-ui";
	import { cn, type WithoutChildrenOrChild } from "@DashboardPT2/ui/lib/utils.js";

	let {
		ref = $bindable(null),
		class: className,
		...restProps
	}: WithoutChildrenOrChild<SelectPrimitive.ScrollUpButtonProps> = $props();
</script>

<SelectPrimitive.ScrollUpButton
	bind:ref
	data-slot="select-scroll-up-button"
	class={cn("z-10 flex cursor-default items-center justify-center bg-popover py-1 [&_svg:not([class*='size-'])]:size-4 top-0 w-full", className)}
	{...restProps}
>
	<Icon icon={ChevronUpIcon} />
</SelectPrimitive.ScrollUpButton>
