<script lang="ts">
	import { InfoIcon } from "@DashboardPT2/ui/components/icons";
	import * as Tooltip from "@DashboardPT2/ui/components/tooltip";
	import { cn } from "@DashboardPT2/ui/lib/utils";

	/**
	 * An explanation, folded into an icon.
	 *
	 * Prose that restates its own heading is deleted rather than moved in here.
	 * What belongs here is the other kind: a rule the interface cannot show and
	 * the reader cannot infer — that a figure is cumulative, that a blank is not
	 * a zero. Those have to stay somewhere, but they do not have to be a
	 * paragraph the fluent user re-reads every visit.
	 */
	let { text, class: className }: { text: string; class?: string } = $props();
</script>

<Tooltip.Root>
	<Tooltip.Trigger>
		{#snippet child({ props })}
			<button
				{...props}
				type="button"
				class={cn(
					"inline-flex rounded-full text-muted-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
					className
				)}
				aria-label={text}
			>
				<InfoIcon class="size-3.5" />
			</button>
		{/snippet}
	</Tooltip.Trigger>
	<Tooltip.Content class="max-w-xs">{text}</Tooltip.Content>
</Tooltip.Root>
