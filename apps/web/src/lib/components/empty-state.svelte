<script lang="ts">
	import * as Empty from "@DashboardPT2/ui/components/empty";
	import type { IconComponent } from "@DashboardPT2/ui/components/icons";
	import { cn } from "@DashboardPT2/ui/lib/utils";
	import type { Snippet } from "svelte";

	/**
	 * Every empty state in the product.
	 *
	 * The primitive's five-part scaffold was written out longhand at six call
	 * sites, and all six passed `class="border-0"` — a default that is wrong
	 * everywhere is not a default. Every one of them also sits inside a Card,
	 * which already draws the edge.
	 */
	let {
		icon,
		title,
		description,
		action,
		class: className
	}: {
		icon: IconComponent;
		title: string;
		description?: string;
		/** A single recovery affordance — clear the filter, retry, create the first record. */
		action?: Snippet;
		class?: string;
	} = $props();

	const Icon = $derived(icon);
</script>

<Empty.Root class={cn("border-0", className)}>
	<Empty.Header>
		<Empty.Media variant="icon"><Icon /></Empty.Media>
		<Empty.Title>{title}</Empty.Title>
		{#if description}
			<Empty.Description>{description}</Empty.Description>
		{/if}
	</Empty.Header>
	{#if action}
		<Empty.Content>{@render action()}</Empty.Content>
	{/if}
</Empty.Root>
