<script lang="ts">
	import { ArrowLeft } from "@DashboardPT2/ui/components/icons";

	/**
	 * Deliberately not part of PageHeader.
	 *
	 * On a detail route the header cannot render until the record loads, and a
	 * reader who has landed on a slow or failed request is exactly the one who
	 * needs the way out. So this sits above the loading branch as its own node
	 * and stays put through every state.
	 */
	let { href, label }: { href: string; label: string } = $props();
</script>

<a
	{href}
	class="inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
>
	<ArrowLeft class="size-3.5" />{label}
</a>
