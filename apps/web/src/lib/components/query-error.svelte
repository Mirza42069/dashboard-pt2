<script lang="ts">
	import { Button } from "@DashboardPT2/ui/components/button";
	import { RefreshCw, TriangleAlert } from "@DashboardPT2/ui/components/icons";
	import { cn } from "@DashboardPT2/ui/lib/utils";

	import { getT } from "../../i18n/context.svelte";

	/**
	 * Inline failure state for a query.
	 *
	 * The QueryCache's global onError already logs, but that is invisible — and
	 * surfaces that render nothing on failure leave the user staring at an empty
	 * page with no explanation and nothing to click. This is the recoverable
	 * half: it says what broke and offers a retry.
	 */
	let {
		error,
		onRetry,
		class: className
	}: { error: unknown; onRetry: () => void; class?: string } = $props();

	const t = getT();
</script>

<div
	role="alert"
	class={cn(
		"flex flex-col items-center gap-3 rounded-lg border border-dashed px-6 py-10 text-center",
		className
	)}
>
	<TriangleAlert class="size-5 text-muted-foreground" />
	<div class="space-y-1">
		<p class="font-medium">{t.common.loadFailed}</p>
		<p class="text-sm text-muted-foreground">
			{error instanceof Error ? error.message : t.common.somethingWentWrong}
		</p>
	</div>
	<Button variant="outline" size="sm" onclick={onRetry}>
		<RefreshCw />
		{t.common.retry}
	</Button>
</div>
