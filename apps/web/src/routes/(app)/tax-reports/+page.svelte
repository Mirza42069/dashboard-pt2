<script lang="ts">
	import { Button } from '@DashboardPT2/ui/components/button';
	import * as Card from '@DashboardPT2/ui/components/card';
	import { Download, FileCode2 } from '@DashboardPT2/ui/components/icons';
	import * as Table from '@DashboardPT2/ui/components/table';

	import { interpolate } from '../../../i18n';
	import { getT } from '../../../i18n/context.svelte';
	import { BRAND_NAME } from '$lib/components/brand';
	import EmptyState from '$lib/components/empty-state.svelte';
	import PageHeader from '$lib/components/page-header.svelte';
	import PageShell from '$lib/components/page-shell.svelte';
	import { useFormat } from '$lib/use-format.svelte';
	import type { ArtifactRow } from '$lib/workbook-index.server';

	let { data }: { data: { artifacts: ArtifactRow[] } } = $props();

	const t = getT();
	const { formatDateTime, quantity } = useFormat();

	/** Sizes are stored as BigInt bytes; kB at one decimal is the useful reading. */
	function fileSize(bytes: number) {
		if (bytes < 1024) return quantity(bytes, 'B');
		if (bytes < 1024 * 1024) return quantity(Math.round((bytes / 1024) * 10) / 10, 'kB');
		return quantity(Math.round((bytes / (1024 * 1024)) * 10) / 10, 'MB');
	}
</script>

<svelte:head><title>{t.taxReports.title} - {BRAND_NAME}</title></svelte:head>

<PageShell>
	<PageHeader eyebrow={BRAND_NAME} title={t.taxReports.title} subtitle={t.taxReports.subtitle} />

	<Card.Root class="overflow-hidden p-0">
		{#if data.artifacts.length === 0}
			<EmptyState
				icon={FileCode2}
				title={t.taxReports.empty}
				description={t.taxReports.emptyHint}
			/>
		{:else}
			<Table.Root class="min-w-[720px]">
				<Table.Header>
					<Table.Row class="hover:bg-transparent">
						<Table.Head class="text-caption tracking-wide uppercase">
							{t.taxReports.colWorkbook}
						</Table.Head>
						<Table.Head class="text-caption tracking-wide uppercase">
							{t.taxReports.colFile}
						</Table.Head>
						<Table.Head class="text-right text-caption tracking-wide uppercase">
							{t.taxReports.colVersion}
						</Table.Head>
						<Table.Head class="text-right text-caption tracking-wide uppercase">
							{t.taxReports.colSize}
						</Table.Head>
						<Table.Head class="text-right text-caption tracking-wide uppercase">
							{t.taxReports.colGenerated}
						</Table.Head>
						<Table.Head class="w-24"><span class="sr-only">{t.taxReports.download}</span></Table.Head>
					</Table.Row>
				</Table.Header>
				<Table.Body>
					{#each data.artifacts as row (row.id)}
						<Table.Row class="h-row-compact">
							<Table.Cell class="py-1">
								<a href={`/workbooks/${row.workbookId}`} class="text-xs font-medium hover:text-brand">
									{row.workbookName}
								</a>
							</Table.Cell>
							<Table.Cell class="py-1 font-mono text-caption text-muted-foreground">
								{row.fileName}
							</Table.Cell>
							<Table.Cell class="py-1 text-right text-xs tabular-nums">v{row.version}</Table.Cell>
							<Table.Cell class="py-1 text-right text-xs text-muted-foreground tabular-nums">
								{fileSize(row.sizeBytes)}
							</Table.Cell>
							<Table.Cell class="py-1 text-right text-xs text-muted-foreground tabular-nums">
								{formatDateTime(row.createdAt)}
							</Table.Cell>
							<Table.Cell class="py-1 text-right">
								<!--
									A plain link to the artifact endpoint, which streams the private
									blob with Content-Disposition: attachment. This is the affordance
									the product was missing: the XML could be generated and then never
									retrieved.
								-->
								<Button
									variant="ghost"
									size="xs"
									href={`/api/imports/artifacts/${row.id}`}
									aria-label={interpolate(t.taxReports.downloadLabel, { name: row.fileName })}
								>
									<Download />
									{t.taxReports.download}
								</Button>
							</Table.Cell>
						</Table.Row>
					{/each}
				</Table.Body>
			</Table.Root>
		{/if}
	</Card.Root>
</PageShell>
