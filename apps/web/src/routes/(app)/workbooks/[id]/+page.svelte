<script lang="ts">
	import { upload } from '@vercel/blob/client';
	import { Button } from '@DashboardPT2/ui/components/button';
	import {
		Check,
		CircleCheck,
		Download,
		FileCode2,
		FileSpreadsheet,
		Loader2,
		TriangleAlert,
		Upload
	} from '@DashboardPT2/ui/components/icons';
	import { Input } from '@DashboardPT2/ui/components/input';
	import { cn } from '@DashboardPT2/ui/lib/utils';
	import { untrack } from 'svelte';
	import { createQuery, useQueryClient } from '@tanstack/svelte-query';
	import { page as pageState } from '$app/state';

	import { interpolate, plural } from '../../../../i18n';
	import { getT } from '../../../../i18n/context.svelte';
	import { BRAND_NAME } from '$lib/components/brand';
	import DataGrid from '$lib/components/grid/data-grid.svelte';
	import { columnName } from '$lib/components/grid/column-name';
	import FormulaBar from '$lib/components/grid/formula-bar.svelte';
	import GridFooter from '$lib/components/grid/grid-footer.svelte';
	import type { GridColumn, GridPosition, GridRow } from '$lib/components/grid/types';
	import MobileNav from '$lib/components/mobile-nav.svelte';
	import { client } from '$lib/orpc';
	import { toast } from '$lib/toast';
	import { useFormat } from '$lib/use-format.svelte';
	import {
		setInspectorFocusHandler,
		setWorkbookInspector,
		type InspectorIssue
	} from '$lib/workbook-inspector.svelte';

	type UnknownRecord = Record<string, unknown>;
	type DocumentType = 'FAKTUR_KELUARAN' | 'BPPU';

	const XLSX_CONTENT_TYPE =
		'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
	const PAGE_SIZE = 50;

	let { data }: { data: { reconciliation: unknown; batch: unknown; rows: unknown } } = $props();

	const t = getT();
	const { formatDateTime } = useFormat();
	const queryClient = useQueryClient();

	function record(value: unknown): UnknownRecord {
		return value !== null && typeof value === 'object' && !Array.isArray(value)
			? (value as UnknownRecord)
			: {};
	}
	function text(value: unknown, fallback = '') {
		return typeof value === 'string' ? value : fallback;
	}
	function cellText(value: unknown) {
		return typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean'
			? String(value)
			: '';
	}
	function number(value: unknown) {
		return typeof value === 'number' ? value : Number(value ?? 0);
	}

	const workbook = $derived(record(data.reconciliation));
	const workbookName = $derived(text(workbook.name, t.workbook.untitled));
	const batches = $derived(
		Array.isArray(workbook.importBatches)
			? workbook.importBatches.map(record).filter((item) => item.documentType)
			: []
	);

	/**
	 * Seeded from the server's choice at init, not in an effect.
	 *
	 * Effects do not run during SSR, so picking the batch there left this empty
	 * on the server, which disabled the row query, which meant its initialData
	 * never applied and the server rendered a spinner over data it already had.
	 * The effect below still handles the case this cannot: a navigation to a
	 * different workbook, where the component is reused rather than remounted.
	 */
	// svelte-ignore state_referenced_locally
	let activeBatchId = $state(text(record(data.batch).id));
	let creatingNew = $state(false);
	let selectedType = $state<DocumentType>('FAKTUR_KELUARAN');
	let files = $state<FileList>();
	let uploading = $state(false);
	let uploadProgress = $state(0);
	let validating = $state(false);
	let generating = $state(false);
	let pageIndex = $state(0);
	let sheet = $state<'invoices' | 'details'>('invoices');
	let position = $state<GridPosition>({ row: 0, col: 0 });

	/**
	 * Derived, not captured once.
	 *
	 * SvelteKit reuses this component across a /workbooks/[id] -> /workbooks/[id]
	 * navigation rather than remounting it, so anything read straight out of
	 * `data` at init would still describe the workbook the reader has left.
	 */
	const prefetchedBatchId = $derived(text(record(data.batch).id));
	const workbookId = $derived(text(workbook.id));

	/**
	 * Reset the whole per-workbook view when the route's id changes, and adopt
	 * whichever batch the server resolved. Keyed on the workbook id so it does
	 * not fire on an ordinary refetch — only on an actual change of subject.
	 */
	$effect(() => {
		workbookId;
		untrack(() => {
			activeBatchId = prefetchedBatchId || text(batches[0]?.id);
			creatingNew = false;
			pageIndex = 0;
			sheet = 'invoices';
			position = { row: 0, col: 0 };
		});
	});

	const batchQuery = createQuery(() => ({
		queryKey: ['coretax', 'batch', activeBatchId],
		queryFn: () => client.importBatch.get({ id: activeBatchId }),
		enabled: Boolean(activeBatchId),
		initialData:
			activeBatchId && activeBatchId === prefetchedBatchId
				? (data.batch as never)
				: undefined
	}));

	const batch = $derived(record(batchQuery.data));
	const batchStatus = $derived(text(batch.status));

	const rowsQuery = createQuery(() => ({
		queryKey: ['coretax', 'rows', activeBatchId, pageIndex],
		queryFn: () =>
			client.importBatch.listRows({ id: activeBatchId, page: pageIndex, limit: PAGE_SIZE }),
		enabled: Boolean(activeBatchId) && batchStatus === 'COMPLETED',
		initialData:
			pageIndex === 0 && activeBatchId && activeBatchId === prefetchedBatchId
				? (data.rows as never)
				: undefined
	}));

	const payload = $derived(record(rowsQuery.data));
	const apiRows = $derived(Array.isArray(payload.rows) ? payload.rows.map(record) : []);
	const fields = $derived(Array.isArray(payload.fields) ? payload.fields.map(String) : []);
	const detailFields = $derived(
		Array.isArray(payload.detailFields) ? payload.detailFields.map(String) : []
	);
	const totalRows = $derived(number(record(payload.batch).rowCount ?? batch.rowCount));
	const dataVersion = $derived(number(record(payload.batch).dataVersion ?? batch.dataVersion));

	const latestValidation = $derived(record(payload.latestValidation));
	const errorCount = $derived(number(latestValidation.errorCount));
	const validationCurrent = $derived(
		Boolean(latestValidation.id) && number(latestValidation.inputDataVersion) === dataVersion
	);

	const artifacts = $derived(Array.isArray(batch.artifacts) ? batch.artifacts.map(record) : []);
	const originalArtifact = $derived(artifacts.find((item) => item.kind === 'ORIGINAL_FILE'));
	/**
	 * The generated Coretax XML, newest first.
	 *
	 * This used to be computed and then never rendered — the product could
	 * produce a filing-ready document and gave the reader no way to get it. The
	 * bytes were always served by GET /api/imports/artifacts/[id]; only the link
	 * was missing.
	 */
	const xmlArtifacts = $derived(
		artifacts
			.filter((item) => item.kind === 'CORETAX_XML')
			.sort((a, b) => number(b.version) - number(a.version))
	);
	const latestXml = $derived(
		xmlArtifacts.find((item) => number(item.inputDataVersion) === dataVersion)
	);

	const isFaktur = $derived(text(batch.documentType) === 'FAKTUR_KELUARAN');
	const documentLabel = $derived(
		isFaktur
			? sheet === 'details'
				? 'DetailFaktur'
				: t.workbook.fakturLabel
			: t.workbook.bppuLabel
	);

	function issueOf(row: UnknownRecord, fieldKey: string): InspectorIssue | null {
		const issues = Array.isArray(row.validationIssues) ? row.validationIssues.map(record) : [];
		const found = issues.find((item) => text(item.fieldKey) === fieldKey);
		if (!found) return null;
		return {
			id: text(found.id),
			code: text(found.code),
			fieldKey,
			severity: text(found.severity),
			rowId: text(row.id),
			locator: text(row.sourceLocator, `${text(row.sourceSheet)}!${number(row.sourceRowNumber)}`)
		};
	}

	const showDetails = $derived(sheet === 'details' && detailFields.length > 0);
	const columns = $derived<GridColumn[]>(
		(showDetails ? detailFields : fields).map((label) => ({ label }))
	);

	const gridRows = $derived<GridRow[]>(
		showDetails
			? apiRows.flatMap((row) => {
					const goods = record(row.normalizedData).GoodsServices;
					const lines = Array.isArray(goods) ? goods.map(record) : [];
					return lines.map((line, lineIndex) => ({
						key: `${text(row.id)}-${lineIndex}`,
						rowId: text(row.id),
						version: number(row.version),
						label: `${number(row.sourceRowNumber)}.${lineIndex + 1}`,
						locator: text(row.sourceLocator),
						cells: detailFields.map((field) => {
							const fieldKey = `GoodsServices.${lineIndex}.${field}`;
							return { fieldKey, value: cellText(line[field]), issue: issueOf(row, fieldKey) };
						})
					}));
				})
			: apiRows.map((row) => {
					const normalized = record(row.normalizedData);
					return {
						key: text(row.id),
						rowId: text(row.id),
						version: number(row.version),
						label: String(number(row.sourceRowNumber)),
						locator: text(row.sourceLocator),
						cells: fields.map((field) => ({
							fieldKey: field,
							value: cellText(normalized[field]),
							issue: issueOf(row, field)
						}))
					};
				})
	);

	const activeRow = $derived(gridRows[position.row] ?? null);
	const activeCell = $derived(activeRow?.cells[position.col] ?? null);
	const address = $derived(
		activeRow && position.col < columns.length
			? `${columnName(position.col)}${activeRow.label}`
			: null
	);

	const pageIssues = $derived(
		gridRows.flatMap((row) =>
			row.cells.map((cell) => cell.issue).filter((issue): issue is InspectorIssue => Boolean(issue))
		)
	);

	/**
	 * Publish the selection for the agent panel, which lives in the shell and so
	 * cannot receive it as a prop. Cleared on unmount, or the panel would keep
	 * offering an Issues tab for a workbook the reader has navigated away from.
	 */
	$effect(() => {
		setWorkbookInspector(
			activeBatchId && batchStatus === 'COMPLETED'
				? {
						batchId: activeBatchId,
						documentLabel,
						selected: activeCell
							? {
									address: address ?? '',
									fieldKey: activeCell.fieldKey,
									value: activeCell.value,
									issue: activeCell.issue
								}
							: null,
						issues: pageIssues
					}
				: null
		);
	});

	$effect(() => {
		setInspectorFocusHandler((issue) => {
			const rowIndex = gridRows.findIndex((row) =>
				row.cells.some((cell) => cell.issue?.id === issue.id)
			);
			if (rowIndex === -1) return;
			const colIndex = gridRows[rowIndex].cells.findIndex((cell) => cell.issue?.id === issue.id);
			if (colIndex === -1) return;
			position = { row: rowIndex, col: colIndex };
		});
		return () => setInspectorFocusHandler(null);
	});

	$effect(() => () => setWorkbookInspector(null));

	function beginNewImport() {
		creatingNew = true;
		activeBatchId = '';
		position = { row: 0, col: 0 };
	}

	async function startUpload() {
		const source = files?.[0];
		if (!source) return toast.error(t.workbook.chooseFileFirst);
		if (!source.name.toLowerCase().endsWith('.xlsx')) return toast.error(t.workbook.onlyXlsx);
		uploading = true;
		uploadProgress = 0;
		try {
			const created = await client.importBatch.createMetadata({
				reconciliationId: pageState.params.id ?? '',
				fileName: source.name,
				contentType: XLSX_CONTENT_TYPE,
				sizeBytes: source.size,
				documentType: selectedType
			});
			const batchId = text(record(created.batch).id);
			// Windows reports .xlsx as octet-stream often enough that the upload
			// token's allowedContentTypes check would reject a perfectly good file.
			const typed =
				source.type === XLSX_CONTENT_TYPE
					? source
					: new File([source], source.name, {
							type: XLSX_CONTENT_TYPE,
							lastModified: source.lastModified
						});
			const stored = await upload(created.uploadPath, typed, {
				access: 'private',
				handleUploadUrl: '/api/imports/upload',
				clientPayload: JSON.stringify({ importBatchId: batchId }),
				onUploadProgress: ({ percentage }) => (uploadProgress = Math.round(percentage))
			});
			await client.importBatch.completeUpload({ id: batchId, objectPath: stored.pathname });
			activeBatchId = batchId;
			creatingNew = false;
			pageIndex = 0;
			files = undefined;
			await Promise.all([
				queryClient.invalidateQueries({ queryKey: ['coretax'] }),
				queryClient.invalidateQueries({ queryKey: ['reconciliation'] })
			]);
			toast.success(t.workbook.stored);
		} catch (error) {
			toast.error(error instanceof Error ? error.message : t.workbook.uploadFailed);
		} finally {
			uploading = false;
		}
	}

	async function commitCell(row: GridRow, fieldKey: string, value: string) {
		try {
			await client.importBatch.patchCell({
				importBatchId: activeBatchId,
				rowId: row.rowId,
				fieldKey,
				value,
				expectedRowVersion: row.version,
				expectedDataVersion: dataVersion
			});
			await Promise.all([
				queryClient.invalidateQueries({ queryKey: ['coretax', 'batch', activeBatchId] }),
				queryClient.invalidateQueries({ queryKey: ['coretax', 'rows', activeBatchId] })
			]);
		} catch (error) {
			/**
			 * The optimistic lock rejected the write: someone else edited this
			 * workbook since the page loaded. Refetch rather than retry — the
			 * reader has to see the current value before deciding again, and a
			 * silent retry would overwrite whatever they have not seen.
			 *
			 * Keyed on the oRPC error code, not its message. The server answers a
			 * stale version with code "CONFLICT" and the sentence "The worksheet
			 * changed. Refresh before editing again." — so matching the word
			 * "conflict" in the text finds nothing, and would have sent every
			 * conflict down the generic-failure path.
			 */
			const conflict =
				typeof error === 'object' && error !== null && 'code' in error
					? (error as { code?: unknown }).code === 'CONFLICT'
					: false;
			toast.error(conflict ? t.workbook.cellConflict : t.workbook.cellUpdateFailed);
			void rowsQuery.refetch();
		}
	}

	async function validateRows() {
		validating = true;
		try {
			const run = await client.importBatch.validate({
				id: activeBatchId,
				expectedDataVersion: dataVersion
			});
			await queryClient.invalidateQueries({ queryKey: ['coretax'] });
			if (run.errorCount === 0) toast.success(t.workbook.validated);
			else toast.error(plural(t.workbook.validationIssues, run.errorCount));
		} catch (error) {
			toast.error(error instanceof Error ? error.message : t.workbook.validateFailed);
		} finally {
			validating = false;
		}
	}

	async function generateXml() {
		generating = true;
		try {
			await client.importBatch.generateXml({
				id: activeBatchId,
				validationRunId: text(latestValidation.id),
				expectedDataVersion: dataVersion
			});
			await queryClient.invalidateQueries({ queryKey: ['coretax', 'batch', activeBatchId] });
			toast.success(t.workbook.xmlGenerated);
		} catch (error) {
			toast.error(error instanceof Error ? error.message : t.workbook.xmlFailed);
		} finally {
			generating = false;
		}
	}

	const sheets = $derived(
		isFaktur
			? [
					{ id: 'invoices', label: t.workbook.fakturLabel },
					{ id: 'details', label: 'DetailFaktur' }
				]
			: [{ id: 'invoices', label: t.workbook.bppuLabel }]
	);

	const showUpload = $derived(creatingNew || !activeBatchId || batchStatus === 'FAILED');
	const showReading = $derived(batchStatus === 'PENDING' || batchStatus === 'PROCESSING');
</script>

<svelte:head><title>{workbookName} - {BRAND_NAME}</title></svelte:head>

<div class="flex h-full min-h-0 flex-col overflow-hidden bg-surface-canvas">
	<header
		class="flex h-9 shrink-0 items-center justify-between gap-3 border-b border-border bg-background px-2"
	>
		<div class="flex min-w-0 items-center gap-2">
			<MobileNav />
			<a
				href="/workbooks"
				class="hidden text-caption text-muted-foreground hover:text-foreground md:inline"
			>
				{t.workbook.back}
			</a>
			<span class="hidden text-caption text-muted-foreground md:inline" aria-hidden="true">/</span>
			<span class="grid size-5 shrink-0 place-items-center rounded-md bg-brand/10 text-brand">
				<FileSpreadsheet class="size-3" />
			</span>
			<h1 class="truncate text-xs font-semibold">{workbookName}</h1>
			<span class="hidden truncate text-caption text-muted-foreground sm:inline">
				{text(batch.originalFilename, t.workbook.noSourceFile)}
				{#if dataVersion}· {interpolate(t.workbook.version, { version: dataVersion })}{/if}
			</span>
			{#if activeBatchId && batchStatus === 'COMPLETED'}
				<span class="hidden items-center gap-1.5 text-caption sm:flex">
					<span
						class={cn(
							'size-1.5 rounded-full',
							validationCurrent && errorCount === 0
								? 'bg-success'
								: errorCount
									? 'bg-destructive'
									: 'bg-warning'
						)}
						aria-hidden="true"
					></span>
					<span class="text-muted-foreground">
						{validationCurrent
							? errorCount
								? plural(t.workbook.validationIssues, errorCount)
								: t.workbook.validated
							: t.workbook.needsValidation}
					</span>
				</span>
			{/if}
		</div>

		<div class="flex shrink-0 items-center gap-1">
			{#if latestXml}
				<Button
					variant="ghost"
					size="xs"
					href={`/api/imports/artifacts/${text(latestXml.id)}`}
					title={text(latestXml.fileName)}
				>
					<FileCode2 />
					{t.workbook.downloadXml}
				</Button>
			{/if}
			{#if originalArtifact}
				<Button
					variant="ghost"
					size="xs"
					href={`/api/imports/artifacts/${text(originalArtifact.id)}`}
				>
					<Download />
					{t.workbook.downloadXlsx}
				</Button>
			{/if}
			<Button variant="outline" size="xs" onclick={beginNewImport}>
				<Upload />
				{t.workbook.import}
			</Button>
			{#if validationCurrent && errorCount === 0 && batchStatus === 'COMPLETED'}
				<Button size="xs" onclick={generateXml} disabled={generating}>
					{#if generating}<Loader2 class="animate-spin" />{:else}<FileCode2 />{/if}
					{generating ? t.workbook.generating : t.workbook.exportXml}
				</Button>
			{/if}
		</div>
	</header>

	{#if showUpload}
		<main class="relative min-h-0 flex-1 overflow-auto bg-background">
			<div
				class="pointer-events-none absolute inset-0 opacity-45 [background-image:linear-gradient(to_right,var(--surface-grid-header)_1px,transparent_1px),linear-gradient(to_bottom,var(--surface-grid-header)_1px,transparent_1px)] [background-size:96px_28px]"
				aria-hidden="true"
			></div>
			<div class="relative mx-auto flex min-h-full max-w-2xl items-center justify-center p-5">
				<div class="w-full border border-border bg-background shadow-lg">
					<div
						class="flex items-center gap-2 border-b border-border bg-surface-grid-header px-3 py-1.5"
					>
						<span class="size-2 rounded-full bg-brand" aria-hidden="true"></span>
						<p class="font-mono text-caption text-muted-foreground uppercase">
							{t.workbooks.create}
						</p>
					</div>
					<div class="p-5">
						<p class="text-caption font-semibold tracking-wide text-brand uppercase">
							{t.workbook.chooseFormat}
						</p>
						<div class="mt-2 grid gap-2 sm:grid-cols-2">
							{#each [{ value: 'FAKTUR_KELUARAN' as const, label: t.workbook.fakturLabel, detail: t.workbook.fakturDetail }, { value: 'BPPU' as const, label: t.workbook.bppuLabel, detail: t.workbook.bppuDetail }] as option (option.value)}
								<button
									type="button"
									onclick={() => (selectedType = option.value)}
									aria-pressed={selectedType === option.value}
									class={cn(
										'flex items-center justify-between gap-2 border px-3 py-2.5 text-left transition-colors',
										selectedType === option.value
											? 'border-brand bg-brand/5'
											: 'border-border hover:bg-muted/40'
									)}
								>
									<span class="min-w-0">
										<span class="block text-xs font-semibold">{option.label}</span>
										<span class="mt-0.5 block text-caption text-muted-foreground">
											{option.detail}
										</span>
									</span>
									{#if selectedType === option.value}
										<CircleCheck class="size-4 shrink-0 text-brand" />
									{/if}
								</button>
							{/each}
						</div>

						<p class="mt-5 text-caption font-semibold tracking-wide text-brand uppercase">
							{t.workbook.chooseFile}
						</p>
						<div
							class="mt-2 flex flex-col gap-2 border border-dashed border-border bg-muted/30 p-2.5 sm:flex-row sm:items-center"
						>
							<Input
								bind:files
								type="file"
								accept=".xlsx,{XLSX_CONTENT_TYPE}"
								disabled={uploading}
								class="border-0 bg-transparent shadow-none"
							/>
							<Button
								size="sm"
								onclick={startUpload}
								disabled={uploading || !files?.length}
								class="sm:min-w-28"
							>
								{#if uploading}
									<Loader2 class="animate-spin" />{uploadProgress}%
								{:else}
									<Upload />{t.workbook.openFile}
								{/if}
							</Button>
						</div>
						{#if batchStatus === 'FAILED'}
							<p class="mt-3 flex items-start gap-2 text-xs text-destructive">
								<TriangleAlert class="mt-0.5 size-3.5 shrink-0" />
								{t.workbook.previousFailed}
							</p>
						{/if}
					</div>
				</div>
			</div>
		</main>
	{:else if showReading}
		<main class="grid min-h-0 flex-1 place-items-center bg-background p-6 text-center">
			<div>
				<Loader2 class="mx-auto size-5 animate-spin text-brand" />
				<p class="mt-3 text-sm font-semibold">{t.workbook.reading}</p>
				<p class="mt-1 text-xs text-muted-foreground">{t.workbook.readingHint}</p>
				<Button class="mt-4" size="sm" variant="outline" onclick={beginNewImport}>
					{t.workbook.startAnother}
				</Button>
			</div>
		</main>
	{:else}
		<main class="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden bg-background">
			<div
				class="flex h-8 shrink-0 items-center justify-between gap-2 border-b border-border bg-surface-grid-header px-1.5"
			>
				<div class="flex min-w-0 items-center gap-1">
					{#if batches.length > 1}
						<select
							value={activeBatchId}
							onchange={(event) => {
								activeBatchId = event.currentTarget.value;
								pageIndex = 0;
								position = { row: 0, col: 0 };
							}}
							class="h-6 max-w-48 rounded-md border border-border bg-background px-1.5 text-caption outline-none"
						>
							{#each batches as item (text(item.id))}
								<option value={text(item.id)}>
									{text(item.documentType).replaceAll('_', ' ')} · {formatDateTime(
										item.createdAt as string
									)}
								</option>
							{/each}
						</select>
					{/if}
				</div>
				<div class="flex items-center gap-1">
					<Button variant="ghost" size="xs" onclick={() => void rowsQuery.refetch()}>
						{t.workbook.refresh}
					</Button>
					<Button
						size="xs"
						onclick={validateRows}
						disabled={validating || gridRows.length === 0}
					>
						{#if validating}<Loader2 class="animate-spin" />{:else}<Check />{/if}
						{validating ? t.workbook.validating : t.workbook.validate}
					</Button>
				</div>
			</div>

			<FormulaBar {address} value={activeCell?.value ?? null} />

			<div class="min-h-0 flex-1 overflow-hidden">
				{#if rowsQuery.isPending}
					<div class="grid h-full place-items-center">
						<Loader2 class="size-5 animate-spin text-muted-foreground" />
					</div>
				{:else if gridRows.length === 0}
					<div class="grid h-full place-items-center">
						<p class="text-xs text-muted-foreground">{t.workbook.noRows}</p>
					</div>
				{:else}
					<DataGrid {columns} rows={gridRows} bind:position onCommit={commitCell} />
				{/if}
			</div>

			<GridFooter
				{sheets}
				activeSheet={sheet}
				page={pageIndex}
				pageSize={PAGE_SIZE}
				total={totalRows}
				onSheet={(id) => {
					sheet = id as 'invoices' | 'details';
					position = { row: 0, col: 0 };
				}}
				onPage={(next) => {
					pageIndex = next;
					position = { row: 0, col: 0 };
				}}
			/>
		</main>
	{/if}
</div>
