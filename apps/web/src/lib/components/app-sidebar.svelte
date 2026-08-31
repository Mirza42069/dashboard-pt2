<script lang="ts">
	import { cn } from "@DashboardPT2/ui/lib/utils";

	import AppNav from "./app-nav.svelte";
	import BrandMark from "./brand-mark.svelte";

	let { collapsed }: { collapsed: boolean } = $props();
</script>

<!--
	Same curve and duration as everything inside the rail — see MOTION in
	app-nav.svelte. Mismatched easing between the container and its contents is
	what makes a collapse look like two animations fighting.

	This one transition is the entire gesture. The rail is an in-flow flex
	sibling of the content column, so animating its width drives the page as well.
-->
<aside
	class={cn(
		"hidden shrink-0 flex-col border-r bg-card transition-[width] duration-[1000ms] ease-[cubic-bezier(0.075,0.82,0.165,1)] md:flex",
		collapsed ? "w-14" : "w-56"
	)}
>
	<!--
		The mark is the complete logo, so no wordmark is added beside it.

		px-4 unconditionally, and deliberately so. The rail is w-14 (56px) and the
		mark keeps a size-6 (24px) layout box, so 16px of padding leaves it in
		exactly the place centring would: (56 - 24) / 2 = 16. Switching to
		justify-center when collapsed looks equivalent but is not, because `width`
		animates over a full second while the class swap is instant — the mark
		would jump to the middle of the still-224px sidebar and slide back.
		Anchoring to a fixed padding makes its position independent of the
		animating width.
	-->
	<div class="flex h-12 shrink-0 items-center overflow-hidden border-b px-4">
		<!--
			Completely still, and not scaling on collapse. The rail's edge is the
			only thing that moves in this animation; the mark holding its exact
			position is what sells the edge as travelling over it rather than the
			contents rearranging themselves.
		-->
		<BrandMark />
	</div>
	<!--
		px-3 unconditionally. This is not just a simplification of a px-2/px-3
		swap — it is what lets the icons hold still. 12px here plus the row's own
		px-2 puts every icon's left edge at 20px, identical in both states, so
		there is nothing left for a padding transition to do.

		min-h-0: same reason as <main> in app-shell.svelte — without it this item
		cannot shrink below its content and the rail grows past h-svh.
	-->
	<div class="min-h-0 flex-1 overflow-y-auto px-3 py-3">
		<AppNav {collapsed} />
	</div>
</aside>
