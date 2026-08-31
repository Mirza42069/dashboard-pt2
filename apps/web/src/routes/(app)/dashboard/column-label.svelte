<script lang="ts">
	import { cn } from "@DashboardPT2/ui/lib/utils";
	import type { Snippet } from "svelte";

	/**
	 * A column's name, in the headline.
	 *
	 * Small, muted and uppercase so it reads as a caption rather than as another
	 * value competing with the figures under it. It takes the column's own class
	 * out of `COL`, which is what makes it disappear at exactly the breakpoint
	 * those figures do.
	 */
	let { class: className, children }: { class?: string; children: Snippet } = $props();
</script>

<span
	class={cn(
		"text-[10px] leading-tight font-medium tracking-wide text-muted-foreground uppercase",
		className
	)}
>
	{@render children()}
</span>
