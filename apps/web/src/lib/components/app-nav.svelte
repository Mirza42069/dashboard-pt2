<script lang="ts">
	import { Button } from '@DashboardPT2/ui/components/button';
	import {
		FileCode2,
		FileSpreadsheet,
		Plus,
		Search,
		Upload
	} from '@DashboardPT2/ui/components/icons';
	import * as Tooltip from '@DashboardPT2/ui/components/tooltip';
	import { cn } from '@DashboardPT2/ui/lib/utils';
	import { createQuery } from '@tanstack/svelte-query';
	import { page } from '$app/state';

	import { getT } from '../../i18n/context.svelte';
	import { client } from '../orpc';

	let {
		collapsed = false,
		onNavigate
	}: { collapsed?: boolean; onNavigate?: () => void } = $props();

	const t = getT();
	let filter = $state('');

	const workbooks = createQuery(() => ({
		queryKey: ['reconciliation', 'sidebar'],
		queryFn: () => client.reconciliation.list({ limit: 12 })
	}));

	const visibleWorkbooks = $derived(
		(workbooks.data?.items ?? []).filter((item) => {
			const term = filter.trim().toLocaleLowerCase();
			return !term || item.name.toLocaleLowerCase().includes(term);
		})
	);

	function isActive(href: string) {
		return page.url.pathname === href || page.url.pathname.startsWith(`${href}/`);
	}

	/**
	 * Three dots, not seven.
	 *
	 * The nav is 60px of rail and cannot carry the full workflow vocabulary, so
	 * it collapses to the only question it can answer at this size: is this
	 * workbook finished, is somebody waiting on it, or is it still being worked?
	 * The written status lives on the workbooks index and in the grid header,
	 * where a StatusBadge has room for its icon and label.
	 */
	function statusTone(status: string) {
		if (status === 'COMPLETED' || status === 'APPROVED') return 'bg-success';
		if (status === 'SUBMITTED' || status === 'READY_FOR_REVIEW') return 'bg-warning';
		return 'bg-brand';
	}

	const sections = $derived([
		{ href: '/workbooks', label: t.nav.workbooks, Icon: FileSpreadsheet },
		{ href: '/imports', label: t.nav.imports, Icon: Upload },
		{ href: '/tax-reports', label: t.nav.taxReports, Icon: FileCode2 }
	]);
</script>

<div class="flex h-full min-h-0 flex-col">
	<Tooltip.Root disabled={!collapsed}>
		<Tooltip.Trigger>
			{#snippet child({ props })}
				<Button
					{...props}
					href="/workbooks?new=1"
					onclick={onNavigate}
					aria-label={collapsed ? t.workbooks.create : undefined}
					class={cn(
						'h-8 w-full overflow-hidden shadow-none',
						collapsed ? 'justify-center px-0' : 'justify-start gap-2 px-2.5'
					)}
				>
					<Plus class="size-3.5 shrink-0" />
					{#if !collapsed}<span class="truncate">{t.workbooks.create}</span>{/if}
				</Button>
			{/snippet}
		</Tooltip.Trigger>
		<Tooltip.Content side="right">{t.workbooks.create}</Tooltip.Content>
	</Tooltip.Root>

	<nav class={cn('mt-3 space-y-0.5', collapsed && 'mt-4')} aria-label={t.nav.sections}>
		{#each sections as item (item.href)}
			{@const active = isActive(item.href)}
			{@const Icon = item.Icon}
			<Tooltip.Root disabled={!collapsed}>
				<Tooltip.Trigger>
					{#snippet child({ props })}
						<a
							{...props}
							href={item.href}
							onclick={onNavigate}
							aria-current={active ? 'page' : undefined}
							aria-label={collapsed ? item.label : undefined}
							class={cn(
								'flex h-7 items-center rounded-md text-xs font-medium transition-colors',
								collapsed ? 'justify-center px-0' : 'gap-2 px-2',
								active
									? 'bg-background text-foreground shadow-2xs ring-1 ring-border'
									: 'text-muted-foreground hover:bg-background/70 hover:text-foreground'
							)}
						>
							<Icon class="size-3.5 shrink-0" />
							{#if !collapsed}<span class="truncate">{item.label}</span>{/if}
						</a>
					{/snippet}
				</Tooltip.Trigger>
				<Tooltip.Content side="right">{item.label}</Tooltip.Content>
			</Tooltip.Root>
		{/each}
	</nav>

	{#if !collapsed}
		<label class="relative mt-4 block">
			<span class="sr-only">{t.nav.searchWorkbooks}</span>
			<Search
				class="pointer-events-none absolute top-1/2 left-2 size-3 -translate-y-1/2 text-muted-foreground"
			/>
			<input
				bind:value={filter}
				type="search"
				placeholder={t.nav.searchWorkbooks}
				class="h-7 w-full rounded-md border border-border bg-background/70 pr-2 pl-7 text-caption outline-none transition focus:border-brand/40 focus:bg-background focus:ring-2 focus:ring-brand/10"
			/>
		</label>

		<div class="mt-3 flex min-h-0 flex-1 flex-col">
			<p
				class="px-1 text-caption font-semibold tracking-wide text-muted-foreground/80 uppercase"
			>
				{t.nav.recentWorkbooks}
			</p>

			<div class="mt-1 min-h-0 flex-1 space-y-px overflow-y-auto pb-4">
				{#if workbooks.isPending}
					{#each Array(4) as _, index (index)}
						<div class="h-7 animate-pulse rounded-md bg-foreground/5"></div>
					{/each}
				{:else if visibleWorkbooks.length === 0}
					<p class="px-1 py-2 text-caption text-muted-foreground">
						{filter.trim() ? t.nav.noMatches : t.nav.noWorkbooks}
					</p>
				{:else}
					{#each visibleWorkbooks as workbook (workbook.id)}
						{@const active = isActive(`/workbooks/${workbook.id}`)}
						<a
							href={`/workbooks/${workbook.id}`}
							onclick={onNavigate}
							aria-current={active ? 'page' : undefined}
							class={cn(
								'flex h-7 items-center gap-2 rounded-md px-2 transition-colors hover:bg-background/80',
								active && 'bg-background shadow-2xs ring-1 ring-border'
							)}
						>
							<span
								class={cn('size-1.5 shrink-0 rounded-full', statusTone(workbook.status))}
								aria-hidden="true"
							></span>
							<span class="min-w-0 flex-1 truncate text-caption">{workbook.name}</span>
						</a>
					{/each}
				{/if}
			</div>
		</div>
	{/if}
</div>
