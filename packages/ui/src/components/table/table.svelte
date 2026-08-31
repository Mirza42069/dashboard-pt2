<script lang="ts">
	import { cn, type WithElementRef } from "@DashboardPT2/ui/lib/utils.js";
	import type { HTMLAttributes, HTMLTableAttributes } from "svelte/elements";

	let {
		ref = $bindable(null),
		containerRef = $bindable(null),
		class: className,
		containerClass,
		containerProps,
		scrollX = true,
		scrollShadows = true,
		children,
		...restProps
	}: WithElementRef<HTMLTableAttributes> & {
		/**
		 * A handle on the scroll container, not on the table.
		 *
		 * The virtualised grids measure and scroll the *container* — it is what
		 * their ResizeObserver watches and what their scroll offsets are read
		 * from. Without this they have to hand-roll the whole wrapper, which is
		 * how five tables in one tab end up with five different paddings and
		 * three different scroll affordances.
		 */
		containerRef?: HTMLDivElement | null;
		/** Merged onto the container: max height, overscroll, scrollbar gutter. */
		containerClass?: string;
		/** role, aria-label, tabindex, onscroll — anything the container needs. */
		containerProps?: Omit<HTMLAttributes<HTMLDivElement>, "class">;
		/**
		 * Whether the container may scroll sideways. On by default.
		 *
		 * False for tables that fit themselves to the container instead of
		 * letting the reader chase columns off the edge. The scroll shadows go
		 * with it — they are the affordance for hidden columns, and a fitted
		 * table has none. This has to be a prop rather than something
		 * `containerClass` cancels: `table-scroll-shadows` is a component class,
		 * not a utility, so tailwind-merge has nothing to override it with.
		 */
		scrollX?: boolean;
		/**
		 * Whether the container paints `table-scroll-shadows`. On by default.
		 *
		 * Off only for a table that draws a better affordance of its own — the
		 * entry grids do, because these shadows sit on the container's
		 * background and never surface from under their opaque sticky columns.
		 *
		 * A prop rather than something `containerClass` cancels, for the same
		 * reason `scrollX` is one.
		 */
		scrollShadows?: boolean;
	} = $props();
</script>

<!--
	table-scroll-shadows (globals.css) fades in a shadow on whichever side still
	has hidden columns — the affordance a bare overflow-x-auto never gives on a
	narrow screen.
-->
<div
	bind:this={containerRef}
	data-slot="table-container"
	class={cn(
		"relative w-full",
		scrollX && "overflow-x-auto",
		scrollX && scrollShadows && "table-scroll-shadows",
		containerClass
	)}
	{...containerProps}
>
	<table
		bind:this={ref}
		data-slot="table"
		class={cn("w-full caption-bottom text-sm", className)}
		{...restProps}
	>
		{@render children?.()}
	</table>
</div>
