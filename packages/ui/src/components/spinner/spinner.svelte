<script lang="ts">
	import { Icon, Loader2Icon } from "@DashboardPT2/ui/components/icons";
	import { cn } from "@DashboardPT2/ui/lib/utils.js";
	import type { ComponentProps } from "svelte";

	let {
		class: className,
		role = "status",
		"aria-label": ariaLabel = "Loading",
		...restProps
	}: Omit<ComponentProps<typeof Icon>, "icon"> = $props();
</script>

<Icon icon={Loader2Icon} {role} aria-label={ariaLabel} class={cn("size-4 animate-spin", className)} {...restProps} />
