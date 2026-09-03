<script lang="ts">
	import { Icon, ChevronRightIcon } from "@DashboardPT2/ui/components/icons";
	import { DropdownMenu as DropdownMenuPrimitive } from "bits-ui";
	import { cn } from "@DashboardPT2/ui/lib/utils.js";

	let {
		ref = $bindable(null),
		class: className,
		inset,
		children,
		...restProps
	}: DropdownMenuPrimitive.SubTriggerProps & {
		inset?: boolean;
	} = $props();
</script>

<DropdownMenuPrimitive.SubTrigger
	bind:ref
	data-slot="dropdown-menu-sub-trigger"
	data-inset={inset}
	class={cn(
		"gap-2 rounded-md px-2 py-2 text-xs focus:bg-accent focus:text-accent-foreground not-data-[variant=destructive]:focus:**:text-accent-foreground data-inset:pl-7 data-open:bg-accent data-open:text-accent-foreground [&_svg:not([class*='size-'])]:size-4 flex cursor-default items-center outline-hidden select-none [&_svg]:pointer-events-none [&_svg]:shrink-0",
		className
	)}
	{...restProps}
>
	{@render children?.()}
	<Icon icon={ChevronRightIcon} class="ml-auto" />
</DropdownMenuPrimitive.SubTrigger>
