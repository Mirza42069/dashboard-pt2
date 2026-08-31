<script lang="ts" module>
	/**
	 * Drawn as discrete rectangular segments rather than one continuous pill. The
	 * blocks are a reading aid — ten of them means a glance lands on "about six
	 * tenths" without going to the number underneath — and the square corners are
	 * what make them read as separate cells instead of one bar with notches cut in.
	 */
	const SEGMENTS = 10;
</script>

<script lang="ts">
	import { cn } from "@DashboardPT2/ui/lib/utils";

	import { getT } from "../../i18n/context.svelte";
	import { progressRampColor } from "../progress-tone";

	/**
	 * A horizontal magnitude meter for one value against one maximum.
	 *
	 * Colour comes from position along the track by default — the shared
	 * five-stop warm-to-lime ramp in lib/progress-tone.ts, also used by TickBar.
	 *
	 * The "magnitude" tone opts back out of that, for meters whose value is not
	 * progress towards something good. Share-of-delay is the case that forced it:
	 * the progress ramp would paint the worst contributor green.
	 *
	 * The overflow state switches to --destructive *and* adds a written label, so
	 * the warning is never carried by colour alone.
	 */
	let {
		value,
		max,
		label,
		ariaLabel,
		segments = SEGMENTS,
		tone = "default",
		class: className
	}: {
		value: number;
		max: number;
		label?: string;
		/** Accessible context when several meters appear together. */
		ariaLabel?: string;
		/** Lower this where the meter sits in a narrow column. */
		segments?: number;
		/**
		 * Overrides the value-derived colour. "success"/"destructive" state a
		 * verdict; "magnitude" keeps a single hue for a quantity the progress ramp
		 * would misdescribe.
		 */
		tone?: "default" | "magnitude" | "success" | "destructive";
		class?: string;
	} = $props();

	const t = getT();
	const ratio = $derived(max > 0 ? value / max : 0);
	const isOver = $derived(max > 0 && value > max);
	// Clamped so an over-limit bar fills the track rather than overflowing it —
	// the overflow is communicated by the colour change and the label instead.
	const filled = $derived(Math.min(Math.max(ratio, 0), 1) * segments);
	// The default tone has no one colour — it walks the progress ramp across the
	// segments, so each one carries its own and there is nothing to name here.
	const fill = $derived(
		isOver || tone === "destructive"
			? "bg-destructive"
			: tone === "success"
				? "bg-success"
				: tone === "magnitude"
					? "bg-[var(--chart-2)]"
					: null
	);
</script>

<div class={cn("space-y-1.5", className)}>
	<!--
		The segments are decoration over a value the meter role already reports, so
		nothing inside here is exposed separately — a screen reader announcing ten
		cells would be ten times the noise for the same one number.
	-->
	<div
		role="meter"
		aria-valuenow={Math.round(value)}
		aria-valuemin={0}
		aria-valuemax={Math.round(max)}
		aria-label={ariaLabel ?? label ?? t.projects.progressMeter}
		class="flex h-3 w-full gap-[2px]"
	>
		{#each Array.from({ length: segments }, (_, index) => index) as index (index)}
			<div aria-hidden="true" class="h-full flex-1 overflow-hidden bg-muted">
				<!--
					The boundary segment fills *partially* rather than rounding to a whole
					block. Rounding is the obvious implementation and it lies at both ends
					of the scale: at 96% every cell would be lit and the bar would read as
					finished, and at 4% none would be lit and it would read as not started.
				-->
				<div
					class={cn("h-full transition-[width] duration-300", fill)}
					style="width: {Math.min(Math.max(filled - index, 0), 1) * 100}%{fill === null
						? `; background-color: ${progressRampColor(index / (segments - 1))}`
						: ''}"
				></div>
			</div>
		{/each}
	</div>
	{#if label !== undefined}
		<p class="text-xs text-muted-foreground">
			{label}
			{#if isOver}<span class="ml-1 font-medium text-destructive">{t.projects.over.toLowerCase()}</span>{/if}
		</p>
	{/if}
</div>
