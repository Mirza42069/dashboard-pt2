<script lang="ts">
	import { cn, type WithElementRef } from "@DashboardPT2/ui/lib/utils.js";
	import type { HTMLAttributes } from "svelte/elements";

	let {
		ref = $bindable(null),
		/** Exactly one item in a swap should be active at a time. */
		active = false,
		class: className,
		children,
		...restProps
	}: WithElementRef<HTMLAttributes<HTMLSpanElement>> & { active?: boolean } = $props();
</script>

<!--
	One layer of an IconSwap.

	The three moving properties are fixed rather than configurable: scale 0.25,
	opacity 0, blur 4px. The blur is what keeps the swap from reading as two
	separate objects — without it the glyphs cross-fade as ghosts of each other;
	with it the outgoing one dissolves and the incoming one resolves.

	Inactive layers keep their box (that is the point of the grid stack) but are
	hidden from assistive technology and from the pointer, so a swap never
	announces two states at once.
-->
<span
	bind:this={ref}
	data-slot="icon-swap-item"
	data-active={active}
	aria-hidden={active ? undefined : "true"}
	class={cn(
		"col-start-1 row-start-1 flex items-center justify-center",
		"scale-[0.25] opacity-0 blur-[4px]",
		"data-[active=true]:scale-100 data-[active=true]:opacity-100 data-[active=true]:blur-none",
		"pointer-events-none data-[active=true]:pointer-events-auto",
		"transition-[opacity,scale,filter] duration-200 ease-[cubic-bezier(0.2,0,0,1)]",
		"motion-reduce:transition-none motion-reduce:scale-100 motion-reduce:blur-none",
		className,
	)}
	{...restProps}
>
	{@render children?.()}
</span>
