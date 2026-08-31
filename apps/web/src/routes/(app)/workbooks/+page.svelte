<script lang="ts">
	import { Button } from '@DashboardPT2/ui/components/button';
	import * as Dialog from '@DashboardPT2/ui/components/dialog';
	import { FileSpreadsheet, Loader2, Plus, Search } from '@DashboardPT2/ui/components/icons';
	import { Input } from '@DashboardPT2/ui/components/input';
	import { Label } from '@DashboardPT2/ui/components/label';
	import * as Table from '@DashboardPT2/ui/components/table';
	import * as Card from '@DashboardPT2/ui/components/card';
	import { createMutation, createQuery, useQueryClient } from '@tanstack/svelte-query';
	import { goto } from '$app/navigation';
	import { page } from '$app/state';

	import { interpolate } from '../../../i18n';
	import { getT } from '../../../i18n/context.svelte';
	import { BRAND_NAME } from '$lib/components/brand';
	import EmptyState from '$lib/components/empty-state.svelte';
	import PageHeader from '$lib/components/page-header.svelte';
	import PageShell from '$lib/components/page-shell.svelte';
	import StatusBadge from '$lib/components/status-badge.svelte';
	import { client } from '$lib/orpc';
	import { toast } from '$lib/toast';
	import { useFormat } from '$lib/use-format.svelte';

	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	const t = getT();
	const { formatDateRange, formatDateTime } = useFormat();
	const queryClient = useQueryClient();

	let filter = $state('');
	let open = $state(page.url.searchParams.get('new') === '1');
	let name = $state('');
	let periodStart = $state('');
	let periodEnd = $state('');

	const workbooks = createQuery(() => ({
		queryKey: ['reconciliation', 'list'],
		queryFn: () => client.reconciliation.list({ limit: 50 }),
		initialData: data.workbooks ?? undefined
	}));

	/**
	 * The first UI that calls `reconciliation.create`.
	 *
	 * The procedure has been implemented, permission-checked and audited from the
	 * start, but nothing rendered it, so there was no way to make a workbook at
	 * all — every one in the product had to come from the seed script. It derives
	 * the legal entity and ledger account from the name, so a name and a period
	 * is the whole form.
	 */
	const create = createMutation(() => ({
		mutationFn: (input: { name: string; periodStart: Date; periodEnd: Date; currency: string }) =>
			client.reconciliation.create(input),
		onSuccess: async (created) => {
			await queryClient.invalidateQueries({ queryKey: ['reconciliation'] });
			toast.success(t.workbooks.created);
			open = false;
			name = '';
			periodStart = '';
			periodEnd = '';
			void goto(`/workbooks/${created.id}`);
		},
		onError: (error) =>
			toast.error(error instanceof Error ? error.message : t.workbooks.createFailed)
	}));

	function submit(event: SubmitEvent) {
		event.preventDefault();
		if (!name.trim()) return toast.error(t.workbooks.nameRequired);
		if (!periodStart || !periodEnd) return toast.error(t.workbooks.periodRequired);
		if (periodEnd < periodStart) return toast.error(t.workbooks.periodOrder);
		create.mutate({
			name: name.trim(),
			periodStart: new Date(`${periodStart}T00:00:00Z`),
			periodEnd: new Date(`${periodEnd}T00:00:00Z`),
			currency: 'IDR'
		});
	}

	const items = $derived(workbooks.data?.items ?? []);
	const visible = $derived(
		items.filter((item) => {
			const term = filter.trim().toLocaleLowerCase();
			return !term || item.name.toLocaleLowerCase().includes(term);
		})
	);
</script>

<svelte:head><title>{t.workbooks.title} - {BRAND_NAME}</title></svelte:head>

<PageShell>
	<PageHeader eyebrow={BRAND_NAME} title={t.workbooks.title} subtitle={t.workbooks.subtitle}>
		{#snippet actions()}
			<Button size="sm" onclick={() => (open = true)}>
				<Plus />
				{t.workbooks.create}
			</Button>
		{/snippet}
	</PageHeader>

	<Card.Root class="overflow-hidden p-0">
		<div class="border-b p-2">
			<label class="relative block max-w-xs">
				<span class="sr-only">{t.workbooks.searchPlaceholder}</span>
				<Search
					class="pointer-events-none absolute top-1/2 left-2 size-3.5 -translate-y-1/2 text-muted-foreground"
				/>
				<input
					bind:value={filter}
					type="search"
					placeholder={t.workbooks.searchPlaceholder}
					class="h-7 w-full rounded-md border border-border bg-background pr-2 pl-7 text-xs outline-none focus:border-brand/40 focus:ring-2 focus:ring-brand/10"
				/>
			</label>
		</div>

		{#if workbooks.isPending}
			<div class="grid place-items-center py-16">
				<Loader2 class="size-5 animate-spin text-muted-foreground" />
			</div>
		{:else if items.length === 0}
			<EmptyState
				icon={FileSpreadsheet}
				title={t.workbooks.empty}
				description={t.workbooks.emptyHint}
			>
				{#snippet action()}
					<Button size="sm" onclick={() => (open = true)}>
						<Plus />
						{t.workbooks.create}
					</Button>
				{/snippet}
			</EmptyState>
		{:else if visible.length === 0}
			<EmptyState icon={Search} title={t.workbooks.noMatch} />
		{:else}
			<Table.Root class="min-w-[720px]">
				<Table.Header>
					<Table.Row class="hover:bg-transparent">
						<Table.Head class="text-caption tracking-wide uppercase">
							{t.workbooks.colName}
						</Table.Head>
						<Table.Head class="text-caption tracking-wide uppercase">
							{t.workbooks.colPeriod}
						</Table.Head>
						<Table.Head class="text-caption tracking-wide uppercase">
							{t.workbooks.colStatus}
						</Table.Head>
						<Table.Head class="text-right text-caption tracking-wide uppercase">
							{t.workbooks.colImports}
						</Table.Head>
						<Table.Head class="text-right text-caption tracking-wide uppercase">
							{t.workbooks.colIssues}
						</Table.Head>
						<Table.Head class="text-right text-caption tracking-wide uppercase">
							{t.workbooks.colUpdated}
						</Table.Head>
					</Table.Row>
				</Table.Header>
				<Table.Body>
					{#each visible as item (item.id)}
						<Table.Row class="h-row-compact">
							<Table.Cell class="py-1">
								<a
									href={`/workbooks/${item.id}`}
									aria-label={interpolate(t.workbooks.open, { name: item.name })}
									class="flex items-center gap-2 font-medium hover:text-brand"
								>
									<FileSpreadsheet class="size-3.5 shrink-0 text-muted-foreground" />
									<span class="truncate text-xs">{item.name}</span>
								</a>
							</Table.Cell>
							<Table.Cell class="py-1 text-xs text-muted-foreground tabular-nums">
								{formatDateRange(item.periodStart, item.periodEnd)}
							</Table.Cell>
							<Table.Cell class="py-1">
								<StatusBadge kind="reconciliation" value={item.status} />
							</Table.Cell>
							<Table.Cell class="py-1 text-right text-xs tabular-nums">
								{item._count?.importBatches ?? 0}
							</Table.Cell>
							<Table.Cell class="py-1 text-right text-xs tabular-nums">
								{#if item._count?.exceptions}
									<span class="text-destructive">{item._count.exceptions}</span>
								{:else}
									<span class="text-muted-foreground">0</span>
								{/if}
							</Table.Cell>
							<Table.Cell class="py-1 text-right text-xs text-muted-foreground tabular-nums">
								{formatDateTime(item.updatedAt)}
							</Table.Cell>
						</Table.Row>
					{/each}
				</Table.Body>
			</Table.Root>
		{/if}
	</Card.Root>
</PageShell>

<Dialog.Root bind:open>
	<Dialog.Content class="sm:max-w-md">
		<Dialog.Header>
			<Dialog.Title>{t.workbooks.create}</Dialog.Title>
			<Dialog.Description>{t.workbooks.createDescription}</Dialog.Description>
		</Dialog.Header>

		<form onsubmit={submit} class="space-y-3">
			<div class="space-y-1.5">
				<Label for="workbook-name">{t.workbooks.name}</Label>
				<Input
					id="workbook-name"
					bind:value={name}
					placeholder={t.workbooks.namePlaceholder}
					autocomplete="off"
					required
				/>
			</div>
			<div class="grid gap-3 sm:grid-cols-2">
				<div class="space-y-1.5">
					<Label for="workbook-start">{t.workbooks.periodStart}</Label>
					<Input id="workbook-start" type="date" bind:value={periodStart} required />
				</div>
				<div class="space-y-1.5">
					<Label for="workbook-end">{t.workbooks.periodEnd}</Label>
					<Input id="workbook-end" type="date" bind:value={periodEnd} required />
				</div>
			</div>

			<Dialog.Footer>
				<Button type="button" variant="outline" size="sm" onclick={() => (open = false)}>
					{t.common.cancel}
				</Button>
				<Button type="submit" size="sm" disabled={create.isPending}>
					{#if create.isPending}<Loader2 class="animate-spin" />{/if}
					{create.isPending ? t.workbooks.creating : t.workbooks.submit}
				</Button>
			</Dialog.Footer>
		</form>
	</Dialog.Content>
</Dialog.Root>
