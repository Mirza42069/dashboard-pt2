<script lang="ts">
	import { Progress as ProgressPrimitive } from "bits-ui";
	import { cn } from "@DashboardPT2/ui/lib/utils.js";
	import { setProgressState } from "./context.svelte.js";
	import ProgressIndicator from "./progress-indicator.svelte";
	import ProgressTrack from "./progress-track.svelte";

	let {
		ref = $bindable(null),
		class: className,
		max = 100,
		value,
		children,
		...restProps
	}: ProgressPrimitive.RootProps = $props();

	// Getters, not a snapshot: the sub-components read through this object every
	// time the bar moves.
	setProgressState({
		get value() {
			return value;
		},
		get max() {
			return max ?? 100;
		}
	});
</script>

<!--
	Root is a row, not the bar. Label and Value are optional children laid out
	beside each other; the track is always appended after them, so a caller never
	has to remember to include it.
-->
<ProgressPrimitive.Root
	bind:ref
	data-slot="progress"
	class={cn("flex flex-wrap gap-3", className)}
	{value}
	{max}
	{...restProps}
>
	{@render children?.()}
	<ProgressTrack>
		<ProgressIndicator />
	</ProgressTrack>
</ProgressPrimitive.Root>
