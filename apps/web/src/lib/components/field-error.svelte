<script lang="ts">
	import { cn } from "@DashboardPT2/ui/lib/utils";

	import type { FieldErrorState } from "../field-error";

	let {
		id,
		messages,
		class: className
	}: Pick<FieldErrorState, "id" | "messages"> & { class?: string } = $props();
</script>

{#if messages.length > 0}
	<p {id} class={cn("text-xs text-destructive", className)}>{messages.join(". ")}</p>
{/if}
