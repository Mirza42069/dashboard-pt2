<script lang="ts" module>
	import { type VariantProps, tv } from "tailwind-variants";

	export const bubbleVariants = tv({
		base: "w-fit max-w-[85%] px-3 py-2 text-sm leading-relaxed whitespace-pre-wrap break-words",
		variants: {
			variant: {
				default: "border bg-card text-card-foreground",
				secondary: "bg-secondary text-secondary-foreground",
				outline: "border bg-background text-foreground",
			},
			// The alignment-aware corner: a small radius on the side the message
			// comes from, pointing back at the speaker.
			align: {
				start: "rounded-lg rounded-bl-sm",
				end: "rounded-lg rounded-br-sm",
			},
		},
		defaultVariants: {
			variant: "default",
			align: "start",
		},
	});

	export type BubbleVariant = VariantProps<typeof bubbleVariants>["variant"];
	export type BubbleAlign = VariantProps<typeof bubbleVariants>["align"];
</script>

<script lang="ts">
	import { cn, type WithElementRef } from "@DashboardPT2/ui/lib/utils.js";
	import type { HTMLAttributes } from "svelte/elements";

	let {
		class: className,
		variant = "default",
		align = "start",
		children,
		...restProps
	}: WithElementRef<HTMLAttributes<HTMLDivElement>> & {
		variant?: BubbleVariant;
		align?: BubbleAlign;
	} = $props();
</script>

<div
	data-slot="bubble"
	data-align={align}
	class={cn(bubbleVariants({ variant, align }), className)}
	{...restProps}
>
	{@render children?.()}
</div>
