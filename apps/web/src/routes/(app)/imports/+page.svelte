<script lang="ts">
	import * as Card from '@DashboardPT2/ui/components/card';
	import { Badge } from '@DashboardPT2/ui/components/badge';
	import { Upload } from '@DashboardPT2/ui/components/icons';
	import * as Table from '@DashboardPT2/ui/components/table';

	import { getT } from '../../../i18n/context.svelte';
	import { BRAND_NAME } from '$lib/components/brand';
	import EmptyState from '$lib/components/empty-state.svelte';
	import PageHeader from '$lib/components/page-header.svelte';
	import PageShell from '$lib/components/page-shell.svelte';
	import { useFormat } from '$lib/use-format.svelte';
	import type { ImportRow } from '$lib/workbook-index.server';

	let { data }: { data: { imports: ImportRow[] } } = $props();

	const t = getT();
	const { formatDateTime } = useFormat();

	/**
	 * A batch status is not a workflow status, so it does not go through
	 * StatusBadge — that component's vocabulary is the workbook's own state, and
	 * borrowing it here would put two unrelated meanings behind one shape.
	 */
	function tone(status: string) {
		if (status === 'COMPLETED') return 'secondary' as const;
		if (status === 'FAILED') return 'destructive' as const;
		return 'outline' as const;
	}

	function label(status: string) {
		const key = status.toLowerCase() as keyof typeof t.imports.status;
		return t.imports.status[key] ?? status;
	}
</script>

<svelte:head><title>{t.imports.title} - {BRAND_NAME}</title></svelte:head>

<PageShell>
	<PageHeader eyebrow={BRAND_NAME} title={t.imports.title} subtitle={t.imports.subtitle} />

	<Card.Root class="overflow-hidden p-0">
		{#if data.imports.length === 0}
			<EmptyState icon={Upload} title={t.imports.empty} description={t.imports.emptyHint} />
		{:else}
			<Table.Root class="min-w-[760px]">
				<Table.Header>
					<Table.Row class="hover:bg-transparent">
						<Table.Head class="text-caption tracking-wide uppercase">
							{t.imports.colWorkbook}
						</Table.Head>
						<Table.Head class="text-caption tracking-wide uppercase">
							{t.imports.colFile}
						</Table.Head>
						<Table.Head class="text-caption tracking-wide uppercase">
							{t.imports.colFormat}
						</Table.Head>
						<Table.Head class="text-right text-caption tracking-wide uppercase">
							{t.imports.colRows}
						</Table.Head>
						<Table.Head class="text-caption tracking-wide uppercase">
							{t.imports.colStatus}
						</Table.Head>
						<Table.Head class="text-right text-caption tracking-wide uppercase">
							{t.imports.colImported}
						</Table.Head>
					</Table.Row>
				</Table.Header>
				<Table.Body>
					{#each data.imports as row (row.id)}
						<Table.Row class="h-row-compact">
							<Table.Cell class="py-1">
								<a href={`/workbooks/${row.workbookId}`} class="text-xs font-medium hover:text-brand">
									{row.workbookName}
								</a>
							</Table.Cell>
							<Table.Cell class="py-1 font-mono text-caption text-muted-foreground">
								{row.fileName || '—'}
							</Table.Cell>
							<Table.Cell class="py-1 text-xs">
								{row.documentType.replaceAll('_', ' ')}
							</Table.Cell>
							<Table.Cell class="py-1 text-right text-xs tabular-nums">{row.rowCount}</Table.Cell>
							<Table.Cell class="py-1">
								<Badge variant={tone(row.status)}>{label(row.status)}</Badge>
							</Table.Cell>
							<Table.Cell class="py-1 text-right text-xs text-muted-foreground tabular-nums">
								{formatDateTime(row.createdAt)}
							</Table.Cell>
						</Table.Row>
					{/each}
				</Table.Body>
			</Table.Root>
		{/if}
	</Card.Root>
</PageShell>
