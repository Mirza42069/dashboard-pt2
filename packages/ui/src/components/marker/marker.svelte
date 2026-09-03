<script lang="ts" module>
	import { type VariantProps, tv } from "tailwind-variants";

	export const markerVariants = tv({
		base: "flex min-w-0 items-start gap-1.5 text-xs leading-relaxed text-muted-foreground [&_svg]:pointer-events-none [&_svg]:mt-0.5 [&_svg]:size-3 [&_svg]:shrink-0",
		variants: {
			variant: {
				default: "",
				bordered: "rounded-md border bg-background/60 px-2 py-1.5",
				separator: "items-center before:h-px before:flex-1 before:bg-border after:h-px after:flex-1 after:bg-border",
			},
		},
		defaultVariants: {
			variant: "default",
		},
	});

	export type MarkerVariant = VariantProps<typeof markerVariants>["variant"];
</script>

<script lang="ts">
	import { cn, type WithElementRef } from "@DashboardPT2/ui/lib/utils.js";
	import type { HTMLAttributes } from "svelte/elements";
	import type { Snippet } from "svelte";

	let {
		class: className,
		variant = "default",
		/**
		 * Live/in-flight state: the label gets the text shimmer.
		 */
		pending = false,
		icon,
		children,
		...restProps
	}: WithElementRef<HTMLAttributes<HTMLDivElement>> & {
		variant?: MarkerVariant;
		pending?: boolean;
		icon?: Snippet;
	} = $props();
</script>

<!--
	A status note in the conversation: a tool/step update, a system note, a
	date break. pending=true keeps the label shimmering while work runs.
-->
<div
	data-slot="marker"
	data-pending={pending ? "" : undefined}
	class={cn(markerVariants({ variant }), className)}
	{...restProps}
>
	{#if icon}
		{@render icon()}
	{/if}
	<div class="min-w-0 flex-1" class:shimmer={pending}>
		{@render children?.()}
	</div>
</div>
