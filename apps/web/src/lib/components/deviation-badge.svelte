<script lang="ts" module>
	import { deviationPosition } from "@DashboardPT2/api/lib/deviation";

	/**
	 * How far a project is from its baseline: actual − planned, in percentage
	 * points. Negative is behind.
	 *
	 * The sign, the number and a word all say the same thing, because colour
	 * alone cannot — the same rule the status badges and meters follow. Someone
	 * reading this in greyscale, or with a red/green colour deficiency, still
	 * gets the answer from the text.
	 */
	export function formatDeviation(value: number) {
		const position = deviationPosition(value);
		const displayed = position === "on_track" ? 0 : value;
		return `${displayed >= 0 ? "+" : "−"}${Math.abs(displayed).toFixed(1)}%`;
	}
</script>

<script lang="ts">
	import { cn } from "@DashboardPT2/ui/lib/utils";

	import { getT } from "../../i18n/context.svelte";

	let {
		value,
		class: className,
		compact = false,
		behindOnly = false
	}: {
		/** Null when the project has no baseline or nothing has been reported yet. */
		value: number | null;
		class?: string;
		/**
		 * Drops the word, keeping the sign.
		 *
		 * For dense lists where the same word would repeat on every row. This does
		 * not give up the non-colour channel — the leading + or − states the
		 * direction in text. Only the redundant second statement goes.
		 */
		compact?: boolean;
		/**
		 * Prints a figure only when the project is behind.
		 *
		 * For the dashboard's exception list, whose whole job is to point at
		 * problems: a column of green "+0.4%" is a column you have to read in
		 * order to discard. Ahead and on-plan collapse to an em dash — but the
		 * word is still spoken, so the cell is not silent to a screen reader.
		 */
		behindOnly?: boolean;
	} = $props();

	const t = getT();
	const position = $derived(value === null ? null : deviationPosition(value));
	const isBehind = $derived(position === "behind");
	const isAhead = $derived(position === "ahead");
	const isOnTrack = $derived(position === "on_track");
</script>

{#if value === null}
	<span class={cn("text-muted-foreground", className)}>{t.common.none}</span>
{:else if behindOnly && !isBehind}
	<span class={cn("text-muted-foreground", className)}>
		<span aria-hidden="true">{t.common.none}</span>
		<span class="sr-only">{isAhead ? t.progress.ahead : t.progress.onTrack}</span>
	</span>
{:else}
	<span
		class={cn("inline-flex items-baseline gap-1.5", className)}
		title={compact
			? isBehind
				? t.progress.behind
				: isAhead
					? t.progress.ahead
					: t.progress.onTrack
			: undefined}
	>
		<span
			class={cn(
				"font-medium tabular-nums",
				isBehind && "text-destructive",
				// --success, not --chart-3. The chart ramp encodes magnitude, so
				// borrowing a step from it to mean "good" says something it does not
				// mean — and --chart-3 fails contrast as text on the dark card.
				(isAhead || isOnTrack) && "text-success"
			)}
		>
			{formatDeviation(value)}
		</span>
		{#if !compact}
			<span class="text-xs text-muted-foreground">
				{isBehind ? t.progress.behind : isAhead ? t.progress.ahead : t.progress.onTrack}
			</span>
		{/if}
	</span>
{/if}
