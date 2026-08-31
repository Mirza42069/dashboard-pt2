<script lang="ts" module>
	import type { TickCategoryTone } from '$lib/components/tick-bar.svelte';

	// Glyphs on a tinted chip, not text, so each can take its full-strength
	// colour rather than the darker value a text-contrast rule would force.
	export const CHIP: Record<TickCategoryTone, string> = {
		late: 'bg-destructive/12 text-destructive',
		waiting: 'bg-brand/12 text-brand',
		settled: 'bg-success/12 text-success',
		neutral: 'bg-[var(--chart-1)]/12 text-[var(--chart-1)]'
	};
</script>

<script lang="ts">
	import { ArrowUpRight, type IconComponent } from '@DashboardPT2/ui/components/icons';
	import { cn } from '@DashboardPT2/ui/lib/utils';

	/**
	 * The top line of a tile: what it is about, and that it goes somewhere.
	 *
	 * The arrow is drawn, never a control. On the portfolio tile the whole card
	 * is already a link and a second one inside it would be invalid markup; on a
	 * filter tile it is an affordance saying the card is pressable, and making it
	 * a link would give one card two hit targets pointing at different places.
	 *
	 * The chip carries the mark's purple. It does not invert when the card is
	 * pressed — the card body already retints for that, and a second signal
	 * saying the same thing is one more state to keep in step for no gain.
	 */
	let { tone, icon }: { tone: TickCategoryTone; icon: IconComponent } = $props();

	// Aliased in the script rather than with {@const}, which is only valid as the
	// immediate child of a block.
	const Icon = $derived(icon);
</script>

<div class="flex items-start justify-between gap-2" aria-hidden="true">
	<span class={cn('grid size-9 shrink-0 place-items-center rounded-xl', CHIP[tone])}>
		<Icon class="size-4" />
	</span>
	<!--
		Grows and lifts a step on hover *or* keyboard focus — a tile that only
		answers the mouse leaves a keyboard user with nothing but the outline. Both
		are cancelled under a reduced-motion preference, where the colour change
		carries it on its own.
	-->
	<span
		class={cn(
			'grid size-7 shrink-0 place-items-center rounded-full',
			'bg-brand text-brand-foreground',
			'transition-[transform,background-color] duration-150',
			'group-hover:scale-110 group-hover:bg-brand-hover',
			'group-focus-visible:scale-110 group-focus-visible:bg-brand-hover',
			'motion-reduce:transition-none motion-reduce:group-hover:scale-100',
			'motion-reduce:group-focus-visible:scale-100'
		)}
	>
		<ArrowUpRight class="size-3.5" />
	</span>
</div>
