<script lang="ts" module>
	import { type VariantProps, tv } from "tailwind-variants";

	export const messageVariants = tv({
		base: "flex min-w-0 gap-2",
		variants: {
			align: {
				start: "flex-row",
				end: "flex-row-reverse",
			},
		},
		defaultVariants: {
			align: "start",
		},
	});

	export type MessageAlign = VariantProps<typeof messageVariants>["align"];
</script>

<script lang="ts">
	import { cn, type WithElementRef } from "@DashboardPT2/ui/lib/utils.js";
	import type { HTMLAttributes } from "svelte/elements";
	import type { Snippet } from "svelte";

	let {
		class: className,
		align = "start",
		avatar,
		header,
		footer,
		children,
		...restProps
	}: WithElementRef<HTMLAttributes<HTMLDivElement>> & {
		align?: MessageAlign;
		avatar?: Snippet;
		header?: Snippet;
		footer?: Snippet;
	} = $props();
</script>

<!--
	A row in the conversation: optional avatar, header, content, footer.
	align="end" mirrors the row for the reader's own messages.
-->
<div
	data-slot="message"
	data-align={align}
	class={cn(messageVariants({ align }), className)}
	{...restProps}
>
	{#if avatar}
		<div data-slot="message-avatar" class="shrink-0 pt-0.5">
			{@render avatar()}
		</div>
	{/if}

	<div
		data-slot="message-body"
		class={cn("flex min-w-0 flex-1 flex-col gap-1.5", align === "end" && "items-end")}
	>
		{#if header}
			<div data-slot="message-header">{@render header()}</div>
		{/if}

		<div data-slot="message-content" class="min-w-0 max-w-full">
			{@render children?.()}
		</div>

		{#if footer}
			<div data-slot="message-footer">{@render footer()}</div>
		{/if}
	</div>
</div>
