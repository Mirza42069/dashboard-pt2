<script lang="ts" module>
	import type { IconSvgElement } from "@hugeicons/svelte";

	/** The glyph data an icon renders. Every export in this module is one. */
	export type IconGlyph = IconSvgElement;
</script>

<script lang="ts">
	import { HugeiconsIcon } from "@hugeicons/svelte";
	import { cn } from "@DashboardPT2/ui/lib/utils.js";
	import type { ComponentProps } from "svelte";

	/**
	 * The one icon renderer.
	 *
	 * Hugeicons ships glyph *data* plus a single component, where lucide shipped
	 * a component per glyph — so call sites read `<Icon icon={CheckIcon} />`
	 * rather than `<CheckIcon />`. Everything else is deliberately unchanged:
	 * HugeiconsIcon renders `<svg width=24 height=24 class={class}>` and spreads
	 * the rest onto it, which is the same shape lucide-svelte produced.
	 *
	 * No default `size-*` class, on purpose. The library sizes icons from the
	 * outside — `[&_svg:not([class*='size-'])]:size-4` in button, `[&_svg]:size-3`
	 * in marker — and injecting one here would win the `:not()` and freeze every
	 * icon at one size.
	 *
	 * `icon` is read once, when the action mounts: swap glyphs with an `{#if}`
	 * branch (a fresh instance), never by recomputing this prop in place.
	 */
	let {
		icon,
		class: className,
		strokeWidth = 1.5,
		...restProps
	}: ComponentProps<typeof HugeiconsIcon> = $props();
</script>

<HugeiconsIcon {icon} {strokeWidth} class={cn(className)} {...restProps} />
