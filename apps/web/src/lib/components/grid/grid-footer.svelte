<script lang="ts">
	import { Button } from '@DashboardPT2/ui/components/button';
	import { ChevronLeft, ChevronRight } from '@DashboardPT2/ui/components/icons';
	import { cn } from '@DashboardPT2/ui/lib/utils';

	import { interpolate } from '../../../i18n';
	import { getT } from '../../../i18n/context.svelte';

	let {
		sheets,
		activeSheet,
		page,
		pageSize,
		total,
		onSheet,
		onPage
	}: {
		sheets: { id: string; label: string }[];
		activeSheet: string;
		page: number;
		pageSize: number;
		total: number;
		onSheet: (id: string) => void;
		onPage: (page: number) => void;
	} = $props();

	const t = getT();
	const from = $derived(total === 0 ? 0 : page * pageSize + 1);
	const to = $derived(Math.min((page + 1) * pageSize, total));
	const hasPrevious = $derived(page > 0);
	const hasNext = $derived((page + 1) * pageSize < total);
</script>

<footer
	class="flex h-7 shrink-0 items-center justify-between border-t border-border bg-surface-grid-header pr-1"
>
	<!--
		Sheet tabs along the bottom, where a spreadsheet puts them. These are the
		workbook's own sheets — Faktur and DetailFaktur for a Faktur Keluaran
		import — not a view the app invented, so they are named as the file names
		them.
	-->
	<div class="flex h-full items-stretch" role="tablist">
		{#each sheets as sheet (sheet.id)}
			<button
				type="button"
				role="tab"
				aria-selected={activeSheet === sheet.id}
				onclick={() => onSheet(sheet.id)}
				class={cn(
					'border-r border-border px-3 text-caption font-medium transition-colors',
					activeSheet === sheet.id
						? 'bg-background text-brand'
						: 'text-muted-foreground hover:text-foreground'
				)}
			>
				{sheet.label}
			</button>
		{/each}
	</div>

	<div class="flex items-center gap-1">
		<span class="text-caption text-muted-foreground tabular-nums">
			{interpolate(t.workbook.rowsRange, { from, to, total })}
		</span>
		<Button
			variant="ghost"
			size="icon-xs"
			disabled={!hasPrevious}
			onclick={() => onPage(page - 1)}
			aria-label={t.workbook.previousPage}
		>
			<ChevronLeft />
		</Button>
		<Button
			variant="ghost"
			size="icon-xs"
			disabled={!hasNext}
			onclick={() => onPage(page + 1)}
			aria-label={t.workbook.nextPage}
		>
			<ChevronRight />
		</Button>
	</div>
</footer>
