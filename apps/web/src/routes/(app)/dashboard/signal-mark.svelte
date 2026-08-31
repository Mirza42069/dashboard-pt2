<script lang="ts" module>
	import type { SeverityLevel } from './severity';

	export const SIGNAL_TONE: Record<SeverityLevel, string> = {
		late: 'text-destructive',
		waiting: 'text-brand',
		// A colour, not the grey of the text it sits next to.
		settled: 'text-[var(--chart-1)]'
	};
</script>

<script lang="ts">
	import { ChevronRight } from '@DashboardPT2/ui/components/icons';
	import * as Popover from '@DashboardPT2/ui/components/popover';
	import * as Tooltip from '@DashboardPT2/ui/components/tooltip';
	import { cn } from '@DashboardPT2/ui/lib/utils';

	import { interpolate } from '../../../i18n';
	import { getT } from '../../../i18n/context.svelte';
	import type { Signal } from './severity';

	/**
	 * One signal, as a mark you can read and press.
	 *
	 * Two shapes of the same control, because one shape cannot serve both
	 * pointers. With a mouse the mark is a link: hovering says what is wrong,
	 * clicking goes to the tab that fixes it — one gesture each, where this used
	 * to cost two clicks through a popup whose whole content was that sentence
	 * and that same link. Under a finger there is no hover to spend on the
	 * explanation, so there the tap opens the popup and the popup carries the
	 * link.
	 */
	let {
		signal,
		name,
		detail,
		href,
		projectName,
		coarse
	}: {
		signal: Signal;
		name: string;
		detail: string;
		href: string;
		projectName: string;
		coarse: boolean;
	} = $props();

	const t = getT();
	const markClass = $derived(
		cn(
			'inline-flex items-center gap-0.5 rounded-full focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring',
			coarse && 'min-h-11 min-w-11 justify-center',
			SIGNAL_TONE[signal.level]
		)
	);
</script>

{#snippet glyph()}
	{@const Icon = signal.Icon}
	<Icon class="size-3.5" />
	{#if signal.count !== undefined}
		<span class="text-xs tabular-nums">{signal.count}</span>
	{/if}
{/snippet}

{#if coarse}
	<Popover.Root>
		<Popover.Trigger>
			{#snippet child({ props })}
				<button
					{...props}
					type="button"
					class={markClass}
					aria-label={signal.count === undefined ? name : `${name}: ${signal.count}`}
				>
					{@render glyph()}
				</button>
			{/snippet}
		</Popover.Trigger>
		<Popover.Content class="w-72 max-w-[min(18rem,calc(100vw-2rem))] space-y-1.5 px-3 py-2.5">
			<p class={cn('text-xs font-medium', SIGNAL_TONE[signal.level])}>{name}</p>
			<p class="text-xs text-muted-foreground">{detail}</p>
			<a
				{href}
				class="inline-flex items-center gap-0.5 text-xs font-medium text-foreground underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
			>
				{interpolate(t.exceptions.viewProject, { name: projectName })}
				<ChevronRight class="size-3.5 text-foreground" />
			</a>
		</Popover.Content>
	</Popover.Root>
{:else}
	<Tooltip.Root>
		<Tooltip.Trigger>
			{#snippet child({ props })}
				<!--
					A tooltip is not reachable by a screen reader, so what it says is the
					link's own name rather than a description of it — the same rule Hint
					follows.
				-->
				<a {...props} {href} class={markClass} aria-label={`${name}. ${detail}`}>
					{@render glyph()}
				</a>
			{/snippet}
		</Tooltip.Trigger>
		<Tooltip.Content class="max-w-xs flex-col items-start gap-0.5 text-left">
			<span class="font-medium">{name}</span>
			<span class="text-background/75">{detail}</span>
		</Tooltip.Content>
	</Tooltip.Root>
{/if}
