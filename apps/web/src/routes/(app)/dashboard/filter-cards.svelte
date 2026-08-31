<script lang="ts">
	import { ListChecks, TrendingUp, TriangleAlert, Wallet } from '@DashboardPT2/ui/components/icons';
	import { Skeleton } from '@DashboardPT2/ui/components/skeleton';
	import { cn } from '@DashboardPT2/ui/lib/utils';

	import { interpolate } from '../../../i18n';
	import { getT } from '../../../i18n/context.svelte';
	import type { DashboardSummary } from '../reconciliations/finance-api';
	import type { AttentionFilter } from './attention-filter';

	let {
		summary,
		pending,
		active,
		onSelect
	}: {
		summary: DashboardSummary | undefined;
		pending: boolean;
		active: AttentionFilter;
		onSelect: (filter: AttentionFilter) => void;
	} = $props();

	const t = getT();
	const cards = $derived([
		{
			key: 'all' as const,
			label: t.financeDashboard.total,
			value: summary?.totalReconciliations,
			detail:
				summary === undefined
					? undefined
					: interpolate(t.financeDashboard.transactionsCount, { count: summary.totalTransactions }),
			Icon: Wallet,
			tone: 'text-[var(--chart-1)] bg-[var(--chart-1)]/10'
		},
		{
			key: 'in_progress' as const,
			label: t.financeDashboard.inProgress,
			value: summary?.inProgress,
			detail:
				summary === undefined
					? undefined
					: interpolate(t.financeDashboard.pendingImports, { count: summary.pendingImports }),
			Icon: TrendingUp,
			tone: 'text-foreground bg-muted'
		},
		{
			key: 'awaiting_approval' as const,
			label: t.financeDashboard.awaitingApproval,
			value: summary?.awaitingApproval,
			detail: undefined,
			Icon: ListChecks,
			tone: 'text-brand bg-brand/10'
		},
		{
			key: 'open_exceptions' as const,
			label: t.financeDashboard.openExceptions,
			value: summary?.openExceptions,
			detail: undefined,
			Icon: TriangleAlert,
			tone: 'text-destructive bg-destructive/10'
		}
	]);
</script>

<section class="grid grid-cols-2 gap-3 xl:grid-cols-4" aria-label={t.financeDashboard.title}>
	{#each cards as card (card.key)}
		{@const selected = active === card.key}
		{@const Icon = card.Icon}
		<button
			type="button"
			aria-pressed={selected}
			onclick={() => onSelect(card.key)}
			class={cn(
				'group min-h-28 rounded-xl bg-card p-4 text-left ring-1 transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring',
				selected ? 'ring-brand/50 bg-brand/[0.035]' : 'ring-foreground/10 hover:bg-muted/35'
			)}
		>
			<div class="flex items-start justify-between gap-3">
				<span class={cn('grid size-9 place-items-center rounded-xl', card.tone)}><Icon class="size-4" /></span>
				<span class={cn('mt-1 size-1.5 rounded-full', selected ? 'bg-brand' : 'bg-border')}></span>
			</div>
			<div class="mt-4">
				<p class="text-xs text-muted-foreground sm:text-sm">{card.label}</p>
				{#if pending}
					<Skeleton class="mt-1 h-7 w-16" />
				{:else}
					<p class="mt-0.5 text-xl font-semibold tracking-tight tabular-nums sm:text-2xl">
						{card.value ?? '—'}
					</p>
				{/if}
				{#if card.detail}
					<p class="mt-1 truncate text-[0.6875rem] text-muted-foreground">{card.detail}</p>
				{/if}
			</div>
		</button>
	{/each}
</section>
