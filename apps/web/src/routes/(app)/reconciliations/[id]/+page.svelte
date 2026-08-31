<script lang="ts">
	import { Badge, type BadgeVariant } from '@DashboardPT2/ui/components/badge';
	import { Button } from '@DashboardPT2/ui/components/button';
	import * as Card from '@DashboardPT2/ui/components/card';
	import * as Empty from '@DashboardPT2/ui/components/empty';
	import { ArrowLeft, Check, CircleAlert, Inbox, RefreshCw, Send } from '@DashboardPT2/ui/components/icons';
	import { Skeleton } from '@DashboardPT2/ui/components/skeleton';
	import * as Tabs from '@DashboardPT2/ui/components/tabs';
	import { Input } from '@DashboardPT2/ui/components/input';
	import { createMutation, createQuery, useQueryClient } from '@tanstack/svelte-query';
	import { page } from '$app/state';

	import { getLocaleState, getT } from '../../../../i18n/context.svelte';
	import { BRAND_NAME } from '$lib/components/brand';
	import QueryError from '$lib/components/query-error.svelte';
	import { client } from '$lib/orpc';
	import { toast } from '$lib/toast';
	import { useFormat } from '$lib/use-format.svelte';
	import {
		financeKeys,
		formatCurrency,
		normalizeExceptionList,
		normalizeReconciliationDetail,
		titleCaseStatus,
		type ExceptionList,
		type ReconciliationDetail
	} from '../finance-api';

	type WorkflowAction = 'submit' | 'approve' | 'reopen';

	let {
		data
	}: { data: { reconciliation: ReconciliationDetail | null; exceptions: ExceptionList | null } } =
		$props();

	const t = getT();
	const locale = getLocaleState();
	const queryClient = useQueryClient();
	const id = $derived(page.params.id ?? '');
	const { formatDate, formatDateTime } = useFormat();
	let tab = $state('overview');
	let resolutionNotes = $state<Record<string, string>>({});

	const reconciliation = createQuery(() => ({
		queryKey: financeKeys.reconciliation(id),
		queryFn: () => client.reconciliation.get({ id }).then(normalizeReconciliationDetail),
		initialData: data.reconciliation ?? undefined
	}));

	const exceptions = createQuery(() => ({
		queryKey: financeKeys.exceptions(id),
		queryFn: () =>
			client.exceptions
				.list({ reconciliationId: id, status: 'OPEN', limit: 100 })
				.then(normalizeExceptionList),
		initialData: data.exceptions ?? undefined
	}));

	const workflow = createMutation(() => ({
		mutationFn: ({ action }: { action: WorkflowAction }) =>
			action === 'submit'
				? client.workflow.submit({ reconciliationId: id })
				: action === 'approve'
					? client.workflow.approve({ reconciliationId: id })
					: client.workflow.reopen({ reconciliationId: id }),
		onSuccess: (_result, { action }) => {
			toast.success(
				action === 'submit'
					? t.financeWorkflow.submitted
					: action === 'approve'
						? t.financeWorkflow.approved
						: t.financeWorkflow.reopened
			);
			void queryClient.invalidateQueries({ queryKey: financeKeys.reconciliation(id) });
			void queryClient.invalidateQueries({ queryKey: financeKeys.reconciliations });
			void queryClient.invalidateQueries({ queryKey: financeKeys.summary });
		},
		onError: () => toast.error(t.financeWorkflow.failed)
	}));

	const resolveException = createMutation(() => ({
		mutationFn: ({ exceptionId, resolutionNote }: { exceptionId: string; resolutionNote: string }) =>
			client.exceptions.resolve({ id: exceptionId, resolutionNote }),
		onSuccess: () => {
			toast.success(t.financeExceptions.resolved);
			void queryClient.invalidateQueries({ queryKey: financeKeys.exceptions(id) });
			void queryClient.invalidateQueries({ queryKey: financeKeys.reconciliation(id) });
			void queryClient.invalidateQueries({ queryKey: financeKeys.summary });
		},
		onError: () => toast.error(t.financeExceptions.resolveFailed)
	}));

	const workflowAction = $derived.by((): WorkflowAction | null => {
		const status = reconciliation.data?.status;
		if (status === 'DRAFT' || status === 'REOPENED') return 'submit';
		if (status === 'SUBMITTED') return 'approve';
		if (status === 'APPROVED') return 'reopen';
		return null;
	});

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

	function workflowLabel(action: WorkflowAction) {
		return action === 'submit'
			? t.financeWorkflow.submit
			: action === 'approve'
				? t.financeWorkflow.approve
				: t.financeWorkflow.reopen;
	}

	function amount(value: string | null, currency: string) {
		return value === null ? t.common.none : formatCurrency(value, currency, locale.intlLocale);
	}
</script>

<svelte:head>
	<title>{reconciliation.data?.name ?? t.reconciliations.detailTitle} - {BRAND_NAME}</title>
</svelte:head>

<div class="mx-auto w-full max-w-[1600px] space-y-5 p-4 md:p-6">
	<a href="/reconciliations" class="inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-foreground">
		<ArrowLeft class="size-3.5" />{t.reconciliations.backToList}
	</a>

	{#if reconciliation.isPending}
		<div class="space-y-3"><Skeleton class="h-8 w-72" /><Skeleton class="h-24 w-full" /><Skeleton class="h-80 w-full" /></div>
	{:else if reconciliation.isError && !reconciliation.data}
		<QueryError error={reconciliation.error} onRetry={() => void reconciliation.refetch()} />
	{:else if reconciliation.data}
		{@const item = reconciliation.data}
		<header class="flex flex-col gap-4 border-b pb-5 sm:flex-row sm:items-end sm:justify-between">
			<div class="min-w-0 space-y-2">
				<div class="flex flex-wrap items-center gap-2">
					<Badge variant={statusVariant(item.status)}>{statusLabel(item.status)}</Badge>
					{#if (exceptions.data?.items.length ?? 0) > 0}<Badge variant="destructive"><CircleAlert />{t.financeDashboard.openExceptions}</Badge>{/if}
				</div>
				<h1 class="truncate text-xl font-semibold tracking-tight md:text-2xl">{item.name}</h1>
				<p class="font-mono text-xs text-muted-foreground">{item.accountCode} · {item.accountName}</p>
			</div>
			{#if workflowAction}
				<Button
					variant={workflowAction === 'reopen' ? 'outline' : 'default'}
					disabled={workflow.isPending}
					onclick={() => workflow.mutate({ action: workflowAction! })}
				>
					{#if workflowAction === 'submit'}<Send />{:else if workflowAction === 'approve'}<Check />{:else}<RefreshCw />{/if}
					{workflow.isPending ? t.financeWorkflow.working : workflowLabel(workflowAction)}
				</Button>
			{/if}
		</header>

		<Tabs.Root bind:value={tab}>
			<Tabs.List class="w-full justify-start overflow-x-auto">
				<Tabs.Trigger value="overview">{t.reconciliations.overview}</Tabs.Trigger>
				<Tabs.Trigger value="transactions">{t.reconciliations.transactions}</Tabs.Trigger>
				<Tabs.Trigger value="exceptions">{t.financeExceptions.tab} ({exceptions.data?.items.length ?? item.exceptionCount})</Tabs.Trigger>
				<Tabs.Trigger value="activity">{t.reconciliations.activity}</Tabs.Trigger>
			</Tabs.List>

			<Tabs.Content value="overview" class="space-y-4">
				<div class="grid grid-cols-2 gap-3 xl:grid-cols-4">
					{#each [
						[t.reconciliations.statementBalance, amount(item.statementBalance, item.currency)],
						[t.reconciliations.reconciledBalance, amount(item.reconciledBalance, item.currency)],
						[t.reconciliations.transactions, item.transactionCount],
						[t.reconciliations.matchGroups, item.matchGroupCount]
					] as metric}
						<Card.Root class="gap-2 py-4">
							<Card.Header class="px-4"><Card.Description>{metric[0]}</Card.Description></Card.Header>
							<Card.Content class="px-4 text-lg font-semibold tracking-tight tabular-nums">
								{metric[1]}
							</Card.Content>
						</Card.Root>
					{/each}
				</div>
				<Card.Root>
					<Card.Header><Card.Title class="text-sm">{t.reconciliations.detailTitle}</Card.Title></Card.Header>
					<Card.Content class="grid gap-x-8 gap-y-4 text-sm sm:grid-cols-2 xl:grid-cols-4">
						<div><p class="text-xs text-muted-foreground">{t.reconciliations.periodStart}</p><p class="mt-1 font-medium">{formatDate(item.periodStart)}</p></div>
						<div><p class="text-xs text-muted-foreground">{t.reconciliations.periodEnd}</p><p class="mt-1 font-medium">{formatDate(item.periodEnd)}</p></div>
						<div><p class="text-xs text-muted-foreground">{t.reconciliations.legalEntity}</p><p class="mt-1 font-medium">{item.legalEntityName || t.common.none}</p></div>
						<div><p class="text-xs text-muted-foreground">{t.reconciliations.lastUpdated}</p><p class="mt-1 font-medium">{formatDateTime(item.updatedAt)}</p></div>
						<div><p class="text-xs text-muted-foreground">{t.reconciliations.openingBalance}</p><p class="mt-1 font-medium tabular-nums">{amount(item.openingBalance, item.currency)}</p></div>
						<div><p class="text-xs text-muted-foreground">{t.reconciliations.closingBalance}</p><p class="mt-1 font-medium tabular-nums">{amount(item.closingBalance, item.currency)}</p></div>
					</Card.Content>
				</Card.Root>
			</Tabs.Content>

			<Tabs.Content value="transactions">
				<Card.Root class="overflow-hidden pt-0"><Card.Content class="px-0">
					<Empty.Root class="border-0"><Empty.Header><Empty.Media variant="icon"><Inbox /></Empty.Media><Empty.Title>{t.reconciliations.noTransactions}</Empty.Title><Empty.Description>{t.reconciliations.transactionCount}: {item.transactionCount}</Empty.Description></Empty.Header></Empty.Root>
				</Card.Content></Card.Root>
			</Tabs.Content>

			<Tabs.Content value="exceptions">
				<Card.Root class="overflow-hidden pt-0"><Card.Content class="px-0">
					{#if exceptions.isPending}<div class="p-5"><Skeleton class="h-64 w-full" /></div>
					{:else if exceptions.isError && !exceptions.data}<QueryError error={exceptions.error} onRetry={() => void exceptions.refetch()} class="m-5" />
					{:else if exceptions.data?.items.length === 0}<Empty.Root class="border-0"><Empty.Header><Empty.Media variant="icon"><Check /></Empty.Media><Empty.Title>{t.financeExceptions.empty}</Empty.Title><Empty.Description>{t.financeExceptions.emptyHint}</Empty.Description></Empty.Header></Empty.Root>
					{:else if exceptions.data}<div class="overflow-x-auto"><table class="w-full min-w-[900px] text-sm">
						<thead class="border-b bg-muted/30 text-[0.6875rem] tracking-wide text-muted-foreground uppercase"><tr><th class="px-5 py-2 text-left font-medium">{t.financeExceptions.description}</th><th class="px-3 py-2 text-left font-medium">{t.financeExceptions.type}</th><th class="px-3 py-2 text-left font-medium">{t.financeExceptions.severity}</th><th class="px-3 py-2 text-left font-medium">{t.financeExceptions.owner}</th><th class="px-5 py-2 text-left font-medium">{t.common.actions}</th></tr></thead>
						<tbody class="divide-y">{#each exceptions.data.items as exception (exception.id)}<tr><td class="max-w-sm px-5 py-2.5"><p class="font-medium">{exception.title}</p>{#if exception.detail}<p class="mt-0.5 text-xs text-muted-foreground">{exception.detail}</p>{/if}</td><td class="px-3 py-2.5 text-xs text-muted-foreground">{titleCaseStatus(exception.type)}</td><td class="px-3 py-2.5"><Badge variant={exception.severity === 'ERROR' ? 'destructive' : 'secondary'}>{titleCaseStatus(exception.severity)}</Badge></td><td class="px-3 py-2.5 font-mono text-xs text-muted-foreground">{exception.assignedToId ?? t.common.unassigned}</td><td class="px-5 py-2.5"><div class="flex min-w-72 gap-2"><Input value={resolutionNotes[exception.id] ?? ''} oninput={(event) => (resolutionNotes[exception.id] = event.currentTarget.value)} placeholder={t.financeExceptions.resolutionPlaceholder} aria-label={t.financeExceptions.resolutionNote} /><Button variant="outline" size="sm" disabled={resolveException.isPending || !(resolutionNotes[exception.id] ?? '').trim()} onclick={() => resolveException.mutate({ exceptionId: exception.id, resolutionNote: resolutionNotes[exception.id].trim() })}>{resolveException.isPending && resolveException.variables?.exceptionId === exception.id ? t.financeExceptions.resolving : t.financeExceptions.resolve}</Button></div></td></tr>{/each}</tbody>
					</table></div>{/if}
				</Card.Content></Card.Root>
			</Tabs.Content>

			<Tabs.Content value="activity">
				<Card.Root><Card.Content>
					{#if item.activity.length === 0}<Empty.Root class="border-0"><Empty.Header><Empty.Media variant="icon"><Inbox /></Empty.Media><Empty.Title>{t.reconciliations.noActivity}</Empty.Title></Empty.Header></Empty.Root>
					{:else}<ol class="divide-y">{#each item.activity as event (event.id)}<li class="grid gap-1 py-3 sm:grid-cols-[1fr_auto]"><div><p class="text-sm font-medium">{titleCaseStatus(event.action)}</p>{#if event.fromStatus || event.toStatus}<p class="text-xs text-muted-foreground">{event.fromStatus ? statusLabel(event.fromStatus) : t.common.none} → {event.toStatus ? statusLabel(event.toStatus) : t.common.none}</p>{/if}</div><time class="text-xs text-muted-foreground">{formatDateTime(event.createdAt)}</time></li>{/each}</ol>{/if}
				</Card.Content></Card.Root>
			</Tabs.Content>
		</Tabs.Root>
	{:else}
		<Empty.Root><Empty.Header><Empty.Media variant="icon"><CircleAlert /></Empty.Media><Empty.Title>{t.reconciliations.notFound}</Empty.Title><Empty.Description>{t.reconciliations.notFoundHint}</Empty.Description></Empty.Header></Empty.Root>
	{/if}
</div>
