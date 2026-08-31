<script lang="ts">
	import { Button } from "@DashboardPT2/ui/components/button";
	import { Loader2 } from "@DashboardPT2/ui/components/icons";

	import { interpolate } from "../../i18n";
	import { getT } from "../../i18n/context.svelte";

	let {
		hasNextPage,
		isFetchingNextPage,
		isFetchNextPageError,
		loadedCount,
		total,
		onLoadMore
	}: {
		hasNextPage: boolean;
		isFetchingNextPage: boolean;
		isFetchNextPageError: boolean;
		loadedCount: number;
		total?: number;
		onLoadMore: () => void;
	} = $props();

	const t = getT();
	let sentinel = $state<HTMLDivElement | null>(null);

	$effect(() => {
		if (!sentinel || !("IntersectionObserver" in window)) return;
		if (!hasNextPage || isFetchingNextPage || isFetchNextPageError) return;

		// AppShell owns vertical scrolling in #main; using it as the root also
		// makes short first pages auto-fill without relying on the browser
		// viewport.
		const observer = new IntersectionObserver(
			([entry]) => {
				if (entry?.isIntersecting) onLoadMore();
			},
			{ root: document.getElementById("main"), rootMargin: "0px 0px 240px" }
		);
		observer.observe(sentinel);
		return () => observer.disconnect();
	});
</script>

{#if loadedCount > 0}
	<div bind:this={sentinel} class="flex flex-wrap items-center justify-between gap-3 py-2">
		<p role="status" aria-live="polite" class="text-xs text-muted-foreground">
			{total === undefined
				? interpolate(t.common.loadedOnly, { count: loadedCount })
				: interpolate(t.common.loadedCount, { count: loadedCount, total })}{isFetchingNextPage
				? ` · ${t.common.loadingMore}`
				: !hasNextPage
					? ` · ${t.common.endOfResults}`
					: ""}
		</p>

		{#if isFetchNextPageError}
			<p role="alert" class="text-sm text-destructive">{t.common.loadMoreFailed}</p>
		{/if}

		{#if hasNextPage}
			<Button
				type="button"
				variant="outline"
				size="sm"
				disabled={isFetchingNextPage}
				onclick={onLoadMore}
			>
				{#if isFetchingNextPage}<Loader2 class="animate-spin" />{/if}
				{isFetchingNextPage
					? t.common.loadingMore
					: isFetchNextPageError
						? t.common.retry
						: t.common.loadMore}
			</Button>
		{/if}
	</div>
{/if}
