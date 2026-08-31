<script lang="ts">
	import { cn } from "@DashboardPT2/ui/lib/utils";
	import type { Snippet } from "svelte";

	/**
	 * The one page container.
	 *
	 * `mx-auto w-full max-w-[1600px] p-4 md:p-6` was copy-pasted into nine route
	 * files, three of which had drifted onto a different vertical rhythm and one
	 * onto a different width. A component rather than a shared class string
	 * because the width is a real choice with exactly two answers, and a string
	 * cannot make you pick one.
	 *
	 * `space-y-5` sits here rather than on each page so the gap between a header
	 * and the first section is the same everywhere — including the gap between an
	 * optional BackLink and the header, which is what the detail pages relied on
	 * the container for before.
	 */
	let {
		width = "wide",
		class: className,
		children
	}: {
		/** `wide` for anything reading data; `form` for a single column of inputs. */
		width?: "wide" | "form";
		class?: string;
		children: Snippet;
	} = $props();
</script>

<div
	class={cn(
		"mx-auto w-full space-y-5 p-4 md:p-6",
		width === "form" ? "max-w-4xl" : "max-w-[1600px]",
		className
	)}
>
	{@render children()}
</div>
