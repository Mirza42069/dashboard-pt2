<script lang="ts">
	import * as Card from '@DashboardPT2/ui/components/card';
	import * as Table from '@DashboardPT2/ui/components/table';

	import { interpolate } from '../../../i18n';
	import { getT } from '../../../i18n/context.svelte';
	import StatusBadge from '../status-badge.svelte';
	import type { AgentResult } from '../../agent-body';
	import { useFormat } from '../../use-format.svelte';

	let { result }: { result: AgentResult } = $props();

	const t = getT();
	const { formatDate, formatDateRange, amountIn } = useFormat();
</script>

<!--
	The evidence behind the sentence.

	Every one of these is built from the same three primitives the deleted screens
	used — Card, Table, StatusBadge — so a result reads as part of the product
	rather than as chat decoration, and the status vocabulary is the one the
	organization already knows.
-->
{#if result.kind === 'reconciliation'}
	<Card.Root class="gap-0 overflow-hidden py-0">
		<div class="flex flex-wrap items-center justify-between gap-3 border-b px-3 py-2">
			<div class="min-w-0">
				<p class="truncate text-xs font-medium">{result.name}</p>
				<p class="text-caption text-muted-foreground">
					{formatDateRange(result.periodStart, result.periodEnd)}
				</p>
			</div>
			<StatusBadge kind="reconciliation" value={result.status} />
		</div>
		<dl class="grid grid-cols-2 divide-x divide-y sm:grid-cols-4 sm:divide-y-0">
			{#each [
				{ label: t.reconciliations.transactions, value: String(result.transactions) },
				{ label: t.reconciliations.exceptions, value: String(result.exceptions) },
				{
					label: t.reconciliations.statementBalance,
					value: amountIn(result.statementBalance, result.currency)
				},
				{
					label: t.reconciliations.reconciledBalance,
					value: amountIn(result.reconciledBalance, result.currency)
				}
			] as cell (cell.label)}
				<div class="px-3 py-2">
					<dt class="text-caption text-muted-foreground">{cell.label}</dt>
					<dd class="mt-0.5 text-xs font-semibold tracking-tight tabular-nums">{cell.value}</dd>
				</div>
			{/each}
		</dl>
	</Card.Root>
{:else if result.kind === 'exceptions' && result.items.length > 0}
	<Card.Root class="overflow-hidden pt-0">
		<Card.Header class="flex-row items-center justify-between gap-2 border-b px-3 py-2">
			<Card.Title class="text-xs">{t.agent.resultExceptions}</Card.Title>
			<span class="text-caption text-muted-foreground tabular-nums">
				{interpolate(t.agent.showingOf, { shown: result.items.length, total: result.total })}
			</span>
		</Card.Header>
		<Card.Content class="px-0">
			<Table.Root class="min-w-[420px]">
				<Table.Header class="bg-muted/30 text-caption tracking-wide text-muted-foreground uppercase">
					<Table.Row>
						<Table.Head class="px-4">{t.financeExceptions.description}</Table.Head>
						<Table.Head>{t.financeExceptions.severity}</Table.Head>
						<Table.Head>{t.agent.period}</Table.Head>
						<Table.Head class="px-4 text-right">{t.financeExceptions.amount}</Table.Head>
					</Table.Row>
				</Table.Header>
				<Table.Body>
					{#each result.items as item (item.id)}
						<Table.Row>
							<Table.Cell class="max-w-xs px-2 py-1.5">
								<p class="truncate font-medium">{item.title}</p>
							</Table.Cell>
							<Table.Cell class="py-1.5">
								<StatusBadge kind="exceptionSeverity" value={item.severity} />
							</Table.Cell>
							<Table.Cell class="max-w-48 truncate py-2.5 text-xs text-muted-foreground">
								{item.reconciliationName}
							</Table.Cell>
							<Table.Cell class="px-2 py-1.5 text-right text-xs tabular-nums">
								<!--
									Formatted, not printed raw. This cell used to render the
									Decimal string straight from the wire — "1240.5000" — while
									the transactions table two branches down put the same kind of
									value through amountIn().

									IDR is passed explicitly because an exception result carries
									no currency of its own, unlike a transaction. That matches
									the rest of the product: format.ts treats money as rupiah by
									definition, and amountIn routes IDR through the house prefix.
								-->
								{item.amount === null ? t.common.none : amountIn(item.amount, 'IDR')}
							</Table.Cell>
						</Table.Row>
					{/each}
				</Table.Body>
			</Table.Root>
		</Card.Content>
	</Card.Root>
{:else if result.kind === 'periods' && result.items.length > 0}
	<Card.Root class="overflow-hidden pt-0">
		<Card.Header class="flex-row items-center justify-between gap-2 border-b px-3 py-2">
			<Card.Title class="text-xs">{t.agent.resultPeriods}</Card.Title>
			<span class="text-caption text-muted-foreground tabular-nums">
				{interpolate(t.agent.showingOf, { shown: result.items.length, total: result.total })}
			</span>
		</Card.Header>
		<Card.Content class="px-0">
			<Table.Root class="min-w-[420px]">
				<Table.Header class="bg-muted/30 text-caption tracking-wide text-muted-foreground uppercase">
					<Table.Row>
						<Table.Head class="px-4">{t.agent.period}</Table.Head>
						<Table.Head>{t.reconciliations.status}</Table.Head>
						<Table.Head class="px-4 text-right">{t.reconciliations.exceptions}</Table.Head>
					</Table.Row>
				</Table.Header>
				<Table.Body>
					{#each result.items as item (item.id)}
						<Table.Row>
							<Table.Cell class="max-w-xs truncate px-4 py-2.5 font-medium">{item.name}</Table.Cell>
							<Table.Cell class="py-1.5">
								<StatusBadge kind="reconciliation" value={item.status} />
							</Table.Cell>
							<Table.Cell class="px-2 py-1.5 text-right tabular-nums">{item.exceptions}</Table.Cell>
						</Table.Row>
					{/each}
				</Table.Body>
			</Table.Root>
		</Card.Content>
	</Card.Root>
{:else if result.kind === 'transactions' && result.items.length > 0}
	<Card.Root class="overflow-hidden pt-0">
		<Card.Header class="flex-row items-center justify-between gap-2 border-b px-3 py-2">
			<Card.Title class="text-xs">{t.agent.resultTransactions}</Card.Title>
			<span class="text-caption text-muted-foreground tabular-nums">
				{interpolate(t.agent.showingOf, { shown: result.items.length, total: result.total })}
			</span>
		</Card.Header>
		<Card.Content class="px-0">
			<Table.Root class="min-w-[420px]">
				<Table.Header class="bg-muted/30 text-caption tracking-wide text-muted-foreground uppercase">
					<Table.Row>
						<Table.Head class="px-4">{t.agent.item}</Table.Head>
						<Table.Head>{t.financeExceptions.owner}</Table.Head>
						<Table.Head>{t.reconciliations.transactionDate}</Table.Head>
						<Table.Head class="px-4 text-right">{t.agent.value}</Table.Head>
					</Table.Row>
				</Table.Header>
				<Table.Body>
					{#each result.items as item (item.id)}
						<Table.Row>
							<Table.Cell class="max-w-xs truncate px-4 py-2.5 font-medium">
								{item.description}
							</Table.Cell>
							<Table.Cell class="max-w-40 truncate py-2.5 text-xs text-muted-foreground">
								{item.counterparty ?? t.common.none}
							</Table.Cell>
							<Table.Cell class="py-1.5 text-xs text-muted-foreground">
								{formatDate(item.effectiveDate)}
							</Table.Cell>
							<Table.Cell class="px-2 py-1.5 text-right font-medium tabular-nums">
								{amountIn(item.amount, item.currency)}
							</Table.Cell>
						</Table.Row>
					{/each}
				</Table.Body>
			</Table.Root>
		</Card.Content>
	</Card.Root>
{/if}
