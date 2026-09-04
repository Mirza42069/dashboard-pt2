<script lang="ts">
	import { cn, type WithElementRef } from "@DashboardPT2/ui/lib/utils.js";
	import type { HTMLAttributes } from "svelte/elements";

	let {
		ref = $bindable(null),
		class: className,
		children,
		...restProps
	}: WithElementRef<HTMLAttributes<HTMLSpanElement>> = $props();
</script>

<!--
	A fixed-size slot that holds several icons at once and cross-fades between
	them, for the places where one icon replaces another to report a state
	change: a spinner becoming a tick, send becoming stop.

	An `{#if}` swap is the obvious way to write those and the wrong one — the
	outgoing glyph vanishes on the same frame the incoming one appears, which
	reads as a flicker at exactly the moment the interface is trying to tell you
	something changed. Every layer stays in the DOM instead, stacked in one grid
	cell so the slot never resizes, and only opacity, scale and blur move.

	Sizing comes from the caller, as everywhere else in this library: give this
	element the icon's size class.
-->
<span
	bind:this={ref}
	data-slot="icon-swap"
	class={cn("relative grid shrink-0 place-items-center", className)}
	{...restProps}
>
	{@render children?.()}
</span>
