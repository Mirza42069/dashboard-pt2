<script lang="ts" module>
	/**
	 * How many pills the track is drawn from.
	 *
	 * Twenty reads as a bar with texture. Many more and the pills merge into a
	 * solid rule; many fewer and the eye starts counting them, comparing counts
	 * instead of taking in the proportion.
	 */
	const TICKS = 20;

	/**
	 * Two kinds of tone, and the distinction matters.
	 *
	 * "progress" is the default and paints each pill from the shared five-stop
	 * warm-to-lime ramp — see lib/progress-tone.ts. Everything else is a
	 * *category*: the dashboard's filter cards use these bars to draw counts of
	 * projects in a state, and the colour there says which state, not how many. A
	 * category tone is one flat colour across the whole fill and must never start
	 * tracking the number, which is why they are not steps of one scale.
	 */
	export type TickTone = "progress" | "late" | "waiting" | "settled" | "neutral";

	/**
	 * The category half of the union, for callers that paint alongside a bar and
	 * must stay in step with it — the filter cards tint an icon chip to match.
	 */
	export type TickCategoryTone = Exclude<TickTone, "progress">;

	const FILL: Record<TickCategoryTone, string> = {
		late: "bg-destructive",
		// The mark's purple. Not a hazard colour by convention, but these are the
		// states that need a person rather than the ones that are going wrong, and
		// reserving red for the latter is what keeps red meaning something.
		waiting: "bg-brand",
		settled: "bg-success",
		// Teal, the prominent end of the chart ramp.
		neutral: "bg-[var(--chart-1)]"
	};
</script>

<script lang="ts">
	import { cn } from "@DashboardPT2/ui/lib/utils";

	import { progressRampColor } from "../progress-tone";

	/**
	 * A proportion, drawn as a run of pills.
	 *
	 * One bar idiom for the whole app: a solid track in one place and a segmented
	 * meter in another read as two different kinds of measurement, and they are
	 * the same kind.
	 *
	 * The unfilled pills are always drawn. A card whose value is zero showing no
	 * bar at all reads as broken rather than as zero, and a row of cards can only
	 * be compared at a glance if every one of them has the thing being compared.
	 */
	let {
		value,
		max,
		tone = "progress",
		class: className
	}: {
		value: number;
		/** Zero renders an empty track rather than dividing by it. */
		max: number;
		tone?: TickTone;
		class?: string;
	} = $props();

	// Clamped both ends before it ever becomes an array length. A non-zero value
	// always shows at least one pill — one project out of forty is not nothing,
	// and rounding it away is the one error this bar must not make.
	const share = $derived(max > 0 && value > 0 ? value / max : 0);
	const filled = $derived(share <= 0 ? 0 : Math.min(TICKS, Math.max(1, Math.round(share * TICKS))));
</script>

<!--
	One height *and* one width everywhere: the pills are a fixed size and the bar
	is as wide as they add up to, rather than stretching to whatever container it
	lands in. Stretching is what breaks this — the same twenty ticks come out as
	fat pills in a filter card and 2px slivers in a list row, so one component
	draws three different-looking bars. Shrinking is still allowed, so a narrower
	container thins the pills instead of overflowing.
-->
<span class={cn("inline-flex h-5 w-fit items-stretch gap-0.5", className)} aria-hidden="true">
	{#each Array.from({ length: TICKS }, (_, index) => index) as index (index)}
		{@const lit = index < filled}
		<span
			class={cn("w-2 rounded-full", !lit && "bg-muted-foreground/20", lit && tone !== "progress" && FILL[tone])}
			style={lit && tone === "progress"
				? `background-color: ${progressRampColor(index / (TICKS - 1))}`
				: undefined}
		></span>
	{/each}
</span>
