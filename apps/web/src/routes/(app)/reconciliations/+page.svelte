<script lang="ts">
	import { Badge, type BadgeVariant } from '@DashboardPT2/ui/components/badge';
	import { Button } from '@DashboardPT2/ui/components/button';
	import * as Empty from '@DashboardPT2/ui/components/empty';
	import { Inbox, Plus, SearchX } from '@DashboardPT2/ui/components/icons';
	import { Input } from '@DashboardPT2/ui/components/input';
	import * as Select from '@DashboardPT2/ui/components/select';
	import { Skeleton } from '@DashboardPT2/ui/components/skeleton';
	import { createInfiniteQuery } from '@tanstack/svelte-query';

	import { interpolate } from '../../../i18n';
	import { getT } from '../../../i18n/context.svelte';
	import { BRAND_NAME } from '$lib/components/brand';
	import InfiniteLoadMore from '$lib/components/infinite-load-more.svelte';
	import QueryError from '$lib/components/query-error.svelte';
	import { client } from '$lib/orpc';
	import { useFormat } from '$lib/use-format.svelte';
	import {
		financeKeys,
		normalizeReconciliationList,
		titleCaseStatus,
		type ReconciliationList
	} from './finance-api';

	let { data }: { data: { reconciliations: ReconciliationList | null } } = $props();
	const t = getT();
	const { formatDateRange, formatDateTime } = useFormat();

	const statuses = ['DRAFT', 'IN_PROGRESS', 'SUBMITTED', 'READY_FOR_REVIEW', 'APPROVED', 'COMPLETED', 'REOPENED'] as const;
	type ReconciliationStatus = (typeof statuses)[number];

	let search = $state('');
	let status = $state<'all' | ReconciliationStatus>('all');

	const query = createInfiniteQuery(() => ({
		queryKey: [...financeKeys.reconciliations, { status }],
		queryFn: ({ pageParam }) =>
			client.reconciliation
				.list({
					limit: 50,
					...(typeof pageParam === 'string' ? { cursor: pageParam } : {}),
					...(status !== 'all' ? { status } : {})
				})
				.then(normalizeReconciliationList),
		initialPageParam: null as string | null,
		getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
		initialData:
			status === 'all' && data.reconciliations
				? { pages: [data.reconciliations], pageParams: [null] }
				: undefined
	}));

	const allRows = $derived(query.data?.pages.flatMap((page) => page.items) ?? []);
	const rows = $derived(
		allRows.filter((row) => {
			const term = search.trim().toLocaleLowerCase();
			return (
				!term ||
				row.name.toLocaleLowerCase().includes(term) ||
				row.accountName.toLocaleLowerCase().includes(term) ||
				row.accountCode.toLocaleLowerCase().includes(term) ||
				row.legalEntityName.toLocaleLowerCase().includes(term)
			);
		})
	);

	function statusLabel(value: string) {
		const key = value.toLowerCase();
		return key in t.financeStatus
			? t.financeStatus[key as keyof typeof t.financeStatus]
			: titleCaseStatus(value);
	}

	function statusVariant(value: string): BadgeVariant {
		if (value === 'APPROVED' || value === 'COMPLETED') return 'outline';
		if (value === 'SUBMITTED' || value === 'READY_FOR_REVIEW') return 'default';
		if (value === 'REOPENED') return 'destructive';
		return 'secondary';
	}
</script>

<svelte:head><title>{t.reconciliations.title} - {BRAND_NAME}</title></svelte:head>

<div class="mx-auto w-full max-w-[1600px] space-y-5 p-4 md:p-6">
	<header class="flex flex-col gap-4 border-b pb-5 sm:flex-row sm:items-end sm:justify-between">
		<div class="space-y-1">
			<h1 class="text-xl font-semibold tracking-tight md:text-2xl">{t.reconciliations.title}</h1>
			<p class="text-sm text-muted-foreground">{t.reconciliations.subtitle}</p>
		</div>
		<Button href="/reconciliations/new"><Plus />{t.reconciliations.newReconciliation}</Button>
	</header>

	<div class="flex flex-col gap-3 rounded-xl border bg-card p-3 sm:flex-row sm:items-center">
		<Input
			type="search"
			value={search}
			oninput={(event) => (search = event.currentTarget.value)}
			placeholder={t.reconciliations.searchPlaceholder}
			aria-label={t.reconciliations.searchPlaceholder}
			class="sm:max-w-sm"
		/>
		<Select.Root type="single" bind:value={status}>
			<Select.Trigger class="w-full sm:w-52" aria-label={t.reconciliations.filterStatus}>
				{status === 'all' ? t.reconciliations.allStatuses : statusLabel(status)}
			</Select.Trigger>
			<Select.Content>
				<Select.Item value="all" label={t.reconciliations.allStatuses}>{t.reconciliations.allStatuses}</Select.Item>
				{#each statuses as value}
					<Select.Item {value} label={statusLabel(value)}>{statusLabel(value)}</Select.Item>
				{/each}
			</Select.Content>
		</Select.Root>
		{#if query.data}
			<p class="ml-auto text-xs text-muted-foreground tabular-nums">
				{interpolate(t.reconciliations.showingLoaded, { count: rows.length })}
			</p>
		{/if}
	</div>

	<section class="overflow-hidden rounded-xl border bg-card" aria-busy={query.isPending}>
		{#if query.isPending}
			<div class="space-y-2 p-5"><Skeleton class="h-9 w-full" /><Skeleton class="h-72 w-full" /></div>
		{:else if query.isError && !query.data}
			<QueryError error={query.error} onRetry={() => void query.refetch()} class="m-5" />
		{:else if rows.length === 0}
			<Empty.Root class="border-0">
				<Empty.Header>
					<Empty.Media variant="icon">{#if search || status !== 'all'}<SearchX />{:else}<Inbox />{/if}</Empty.Media>
					<Empty.Title>{search || status !== 'all' ? t.reconciliations.noMatch : t.reconciliations.empty}</Empty.Title>
					<Empty.Description>{search || status !== 'all' ? t.reconciliations.noMatchHint : t.reconciliations.emptyHint}</Empty.Description>
				</Empty.Header>
			</Empty.Root>
		{:else if query.data}
			<div class="overflow-x-auto">
				<table class="w-full min-w-[980px] text-sm">
					<thead class="border-b bg-muted/30 text-[0.6875rem] tracking-wide text-muted-foreground uppercase">
						<tr>
							<th class="px-5 py-2 text-left font-medium">{t.reconciliations.account}</th>
							<th class="px-3 py-2 text-left font-medium">{t.reconciliations.period}</th>
							<th class="px-3 py-2 text-left font-medium">{t.reconciliations.status}</th>
							<th class="px-3 py-2 text-left font-medium">{t.reconciliations.legalEntity}</th>
							<th class="px-3 py-2 text-right font-medium">{t.reconciliations.exceptions}</th>
							<th class="px-3 py-2 text-right font-medium">{t.reconciliations.imports}</th>
							<th class="px-5 py-2 text-right font-medium">{t.reconciliations.updated}</th>
						</tr>
					</thead>
					<tbody class="divide-y">
						{#each rows as row (row.id)}
							<tr class="transition-colors hover:bg-muted/25">
								<td class="relative px-5 py-2.5">
									{#if row.exceptionCount > 0}<span class="absolute inset-y-0 left-0 w-0.5 bg-destructive"></span>{/if}
									<a href={`/reconciliations/${row.id}`} class="block max-w-xs rounded-sm font-medium hover:underline focus-visible:outline-2 focus-visible:outline-ring">
										<span class="block truncate">{row.accountName}</span>
										<span class="block truncate font-mono text-[0.6875rem] font-normal text-muted-foreground">{row.accountCode}</span>
									</a>
								</td>
								<td class="px-3 py-2.5 text-xs text-muted-foreground">{formatDateRange(row.periodStart, row.periodEnd)}</td>
								<td class="px-3 py-2.5"><Badge variant={statusVariant(row.status)}>{statusLabel(row.status)}</Badge></td>
								<td class="max-w-48 truncate px-3 py-2.5 text-xs text-muted-foreground">{row.legalEntityName || t.common.none}</td>
								<td class:text-destructive={row.exceptionCount > 0} class="px-3 py-2.5 text-right font-medium tabular-nums">{row.exceptionCount}</td>
								<td class="px-3 py-2.5 text-right tabular-nums">{row.importCount}</td>
								<td class="px-5 py-2.5 text-right text-xs text-muted-foreground">{formatDateTime(row.updatedAt)}</td>
							</tr>
						{/each}
					</tbody>
				</table>
			</div>
		{/if}
		{#if query.data}
			<div class="px-5">
				<InfiniteLoadMore
					hasNextPage={query.hasNextPage}
					isFetchingNextPage={query.isFetchingNextPage}
					isFetchNextPageError={query.isFetchNextPageError}
					loadedCount={allRows.length}
					onLoadMore={() => void query.fetchNextPage()}
				/>
			</div>
		{/if}
	</section>
</div>
