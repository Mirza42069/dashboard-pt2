<script lang="ts">
	import { Badge, type BadgeVariant } from '@DashboardPT2/ui/components/badge';
	import { Button } from '@DashboardPT2/ui/components/button';
	import * as Card from '@DashboardPT2/ui/components/card';
	import * as Empty from '@DashboardPT2/ui/components/empty';
	import { Inbox, SearchX } from '@DashboardPT2/ui/components/icons';
	import { Skeleton } from '@DashboardPT2/ui/components/skeleton';

	import { interpolate } from '../../../i18n';
	import { getT } from '../../../i18n/context.svelte';
	import QueryError from '$lib/components/query-error.svelte';
	import { useFormat } from '$lib/use-format.svelte';
	import {
		titleCaseStatus,
		type ReconciliationListItem
	} from '../reconciliations/finance-api';
	import type { AttentionFilter } from './attention-filter';

	let {
		rows,
		unfilteredCount,
		filter,
		pending,
		error,
		onRetry,
		onClearFilter
	}: {
		rows: ReconciliationListItem[];
		unfilteredCount: number;
		filter: AttentionFilter;
		pending: boolean;
		error: unknown;
		onRetry: () => void;
		onClearFilter: () => void;
	} = $props();

	const t = getT();
	const { formatDateRange, formatDateTime } = useFormat();

	function statusLabel(status: string) {
		const key = status.toLowerCase();
		return key in t.financeStatus
			? t.financeStatus[key as keyof typeof t.financeStatus]
			: titleCaseStatus(status);
	}

	function statusVariant(status: string): BadgeVariant {
		if (status === 'APPROVED' || status === 'COMPLETED') return 'outline';
		if (status === 'SUBMITTED' || status === 'READY_FOR_REVIEW') return 'default';
		if (status === 'REOPENED') return 'destructive';
		return 'secondary';
	}
</script>

<Card.Root class="overflow-hidden pt-0">
	<Card.Header class="flex-row items-start justify-between gap-4 border-b py-4">
		<div>
			<Card.Title class="text-sm">{t.financeDashboard.attentionTitle}</Card.Title>
			<Card.Description>{t.financeDashboard.attentionDescription}</Card.Description>
		</div>
		<Badge variant="outline">{rows.length}</Badge>
	</Card.Header>
	<Card.Content class="px-0">
		{#if pending}
			<div class="space-y-2 p-5"><Skeleton class="h-9 w-full" /><Skeleton class="h-64 w-full" /></div>
		{:else if error}
			<QueryError {error} {onRetry} class="m-5" />
		{:else if rows.length === 0}
			<Empty.Root class="border-0">
				<Empty.Header>
					<Empty.Media variant="icon">{#if filter === 'all'}<Inbox />{:else}<SearchX />{/if}</Empty.Media>
					<Empty.Title>{filter === 'all' ? t.financeDashboard.empty : t.financeDashboard.filterEmpty}</Empty.Title>
					<Empty.Description>
						{filter === 'all' ? t.financeDashboard.emptyHint : t.reconciliations.noMatchHint}
					</Empty.Description>
				</Empty.Header>
				{#if filter !== 'all' && unfilteredCount > 0}
					<Empty.Content><Button variant="outline" size="sm" onclick={onClearFilter}>{t.financeDashboard.clearFilter}</Button></Empty.Content>
				{/if}
			</Empty.Root>
		{:else}
			<div class="overflow-x-auto">
				<table class="w-full min-w-[760px] text-sm">
					<thead class="border-b bg-muted/30 text-[0.6875rem] tracking-wide text-muted-foreground uppercase">
						<tr>
							<th class="px-5 py-2 text-left font-medium">{t.financeDashboard.account}</th>
							<th class="px-3 py-2 text-left font-medium">{t.financeDashboard.period}</th>
							<th class="px-3 py-2 text-left font-medium">{t.financeDashboard.status}</th>
							<th class="px-3 py-2 text-right font-medium">{t.financeDashboard.exceptions}</th>
							<th class="px-3 py-2 text-right font-medium">{t.reconciliations.imports}</th>
							<th class="px-5 py-2 text-right font-medium">{t.financeDashboard.updated}</th>
						</tr>
					</thead>
					<tbody class="divide-y">
						{#each rows as row (row.id)}
							<tr class="relative transition-colors hover:bg-muted/25">
								<td class="relative px-5 py-2.5">
									{#if row.exceptionCount > 0}<span class="absolute inset-y-0 left-0 w-0.5 bg-destructive"></span>{/if}
									<a href={`/reconciliations/${row.id}`} class="block max-w-xs rounded-sm font-medium hover:underline focus-visible:outline-2 focus-visible:outline-ring" aria-label={interpolate(t.financeDashboard.view, { name: row.name })}>
										<span class="block truncate">{row.accountName}</span>
										<span class="block truncate font-mono text-[0.6875rem] font-normal text-muted-foreground">{row.accountCode} · {row.legalEntityName}</span>
									</a>
								</td>
								<td class="px-3 py-2.5 text-xs text-muted-foreground">{formatDateRange(row.periodStart, row.periodEnd)}</td>
								<td class="px-3 py-2.5"><Badge variant={statusVariant(row.status)}>{statusLabel(row.status)}</Badge></td>
								<td class:text-destructive={row.exceptionCount > 0} class="px-3 py-2.5 text-right font-medium tabular-nums">{row.exceptionCount}</td>
								<td class="px-3 py-2.5 text-right tabular-nums">{row.importCount}</td>
								<td class="px-5 py-2.5 text-right text-xs text-muted-foreground">{formatDateTime(row.updatedAt)}</td>
							</tr>
						{/each}
					</tbody>
				</table>
			</div>
		{/if}
	</Card.Content>
</Card.Root>
