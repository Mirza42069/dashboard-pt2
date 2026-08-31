<script lang="ts">
	import { Button } from '@DashboardPT2/ui/components/button';
	import { Plus } from '@DashboardPT2/ui/components/icons';
	import { createQuery } from '@tanstack/svelte-query';

	import { getT } from '../../../i18n/context.svelte';
	import QueryError from '$lib/components/query-error.svelte';
	import { client } from '$lib/orpc';
	import {
		financeKeys,
		normalizeDashboardSummary,
		normalizeReconciliationList,
		type DashboardSummary,
		type ReconciliationList
	} from '../reconciliations/finance-api';
	import type { AttentionFilter } from './attention-filter';
	import AttentionList from './attention-list.svelte';
	import FilterCards from './filter-cards.svelte';

	let {
		initialSummary,
		initialReconciliations
	}: {
		initialSummary: DashboardSummary | null;
		initialReconciliations: ReconciliationList | null;
	} = $props();

	const t = getT();
	let filter = $state<AttentionFilter>('all');

	const summary = createQuery(() => ({
		queryKey: financeKeys.summary,
		queryFn: () => client.dashboard.summary().then(normalizeDashboardSummary),
		initialData: initialSummary ?? undefined
	}));

	const reconciliations = createQuery(() => ({
		queryKey: [...financeKeys.reconciliations, { limit: 25 }],
		queryFn: () => client.reconciliation.list({ limit: 25 }).then(normalizeReconciliationList),
		initialData: initialReconciliations ?? undefined
	}));

	const rows = $derived(
		(reconciliations.data?.items ?? []).filter((row) => {
			if (filter === 'open_exceptions') return row.exceptionCount > 0;
			if (filter === 'awaiting_approval') {
				return row.status === 'SUBMITTED' || row.status === 'READY_FOR_REVIEW';
			}
			if (filter === 'in_progress') {
				return row.status === 'DRAFT' || row.status === 'IN_PROGRESS' || row.status === 'REOPENED';
			}
			return true;
		})
	);
</script>

<div class="mx-auto w-full max-w-[1600px] space-y-5 p-4 md:p-6">
	<header class="flex flex-col gap-4 border-b pb-5 sm:flex-row sm:items-end sm:justify-between">
		<div class="max-w-3xl space-y-1">
			<p class="text-[0.6875rem] font-semibold tracking-[0.18em] text-brand uppercase">
				{t.financeDashboard.eyebrow}
			</p>
			<h1 class="text-xl font-semibold tracking-tight md:text-2xl">{t.financeDashboard.title}</h1>
			<p class="text-sm text-muted-foreground">{t.financeDashboard.subtitle}</p>
		</div>
		<Button href="/reconciliations/new" class="shrink-0">
			<Plus />
			{t.financeDashboard.newReconciliation}
		</Button>
	</header>

	<p class="sr-only" role="status" aria-live="polite">
		{summary.isPending || reconciliations.isPending
			? t.financeDashboard.loading
			: t.financeDashboard.loaded}
	</p>

	{#if summary.isError && !summary.data}
		<QueryError error={summary.error} onRetry={() => void summary.refetch()} />
	{:else}
		<FilterCards
			summary={summary.data}
			pending={summary.isPending}
			active={filter}
			onSelect={(next) => (filter = next)}
		/>
	{/if}

	<AttentionList
		{rows}
		unfilteredCount={reconciliations.data?.items.length ?? 0}
		{filter}
		pending={reconciliations.isPending}
		error={reconciliations.isError && !reconciliations.data ? reconciliations.error : null}
		onRetry={() => void reconciliations.refetch()}
		onClearFilter={() => (filter = 'all')}
	/>
</div>
