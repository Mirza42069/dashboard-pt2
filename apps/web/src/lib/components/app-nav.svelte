<script lang="ts">
	import { Button } from '@DashboardPT2/ui/components/button';
	import { FileCode2, FileSpreadsheet, Plus, Upload } from '@DashboardPT2/ui/components/icons';
	import * as Tooltip from '@DashboardPT2/ui/components/tooltip';
	import { cn } from '@DashboardPT2/ui/lib/utils';
	import { createQuery } from '@tanstack/svelte-query';
	import { page } from '$app/state';

	import { getT } from '../../i18n/context.svelte';
	import { client } from '../orpc';

	let {
		collapsed = false,
		appearance = 'default',
		onNavigate
	}: {
		collapsed?: boolean;
		appearance?: 'default' | 'rail';
		onNavigate?: () => void;
	} = $props();

	const t = getT();
	const isRail = $derived(appearance === 'rail');

	const workbooks = createQuery(() => ({
		queryKey: ['reconciliation', 'sidebar'],
		queryFn: () => client.reconciliation.list({ limit: 12 })
	}));

	const recent = $derived(workbooks.data?.items ?? []);

	function isActive(href: string) {
		return page.url.pathname === href || page.url.pathname.startsWith(`${href}/`);
	}

	/**
	 * Three dots, not seven.
	 *
	 * The rail cannot carry the full workflow vocabulary, so it collapses to the
	 * only question it can answer at this size: is this workbook finished, is
	 * somebody waiting on it, or is it still being worked? The written status
	 * lives on the workbooks index and in the grid header, where a StatusBadge
	 * has room for its icon and label.
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
						'w-full overflow-hidden shadow-none transition-colors',
						collapsed
							? 'h-10 justify-center rounded-full px-0'
							: 'h-9 justify-start gap-2.5 rounded-xl px-2.5',
						isRail &&
							(collapsed
								? 'bg-white/10 text-white hover:bg-white/20'
								: 'bg-white text-black hover:bg-white/85')
					)}
				>
					<span class="grid w-5 shrink-0 place-items-center"><Plus class="size-4" /></span>
					{#if !collapsed}<span class="truncate">{t.workbooks.create}</span>{/if}
				</Button>
			{/snippet}
		</Tooltip.Trigger>
		<Tooltip.Content side="right">{t.workbooks.create}</Tooltip.Content>
	</Tooltip.Root>

	<nav class={cn('mt-3 space-y-1', collapsed && 'mt-4')} aria-label={t.nav.sections}>
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
								'flex items-center text-xs font-medium outline-none transition-colors focus-visible:ring-2',
								collapsed
									? 'h-10 justify-center rounded-full px-0'
									: 'h-9 gap-2.5 rounded-xl px-2.5',
								isRail
									? active
										? 'bg-white/15 text-white ring-1 ring-white/10 focus-visible:ring-white/70'
										: 'text-white/60 hover:bg-white/10 hover:text-white focus-visible:ring-white/70'
									: active
										? 'bg-background text-foreground shadow-2xs ring-1 ring-border focus-visible:ring-ring'
										: 'text-muted-foreground hover:bg-background/70 hover:text-foreground focus-visible:ring-ring'
							)}
						>
							<span class="grid w-5 shrink-0 place-items-center"><Icon class="size-4" /></span>
							{#if !collapsed}<span class="truncate">{item.label}</span>{/if}
						</a>
					{/snippet}
				</Tooltip.Trigger>
				<Tooltip.Content side="right">{item.label}</Tooltip.Content>
			</Tooltip.Root>
		{/each}
	</nav>

	{#if !collapsed}
		<!--
			Recents, not a second navigation. These are the last twelve workbooks
			touched, in the order the server returns them — a way back to what you
			were in the middle of, which the three section links above cannot give
			you. Hidden on the collapsed rail: a status dot with no name beside it
			says nothing worth 40px.
		-->
		<div class="mt-5 flex min-h-0 flex-1 flex-col">
			<p
				class={cn(
					'px-2.5 text-caption font-semibold tracking-wide uppercase',
					isRail ? 'text-white/35' : 'text-muted-foreground/80'
				)}
			>
				{t.nav.recentWorkbooks}
			</p>

			<div class="mt-1 min-h-0 flex-1 space-y-px overflow-y-auto pb-2">
				{#if workbooks.isPending}
					{#each Array(4) as _, index (index)}
						<div
							class={cn(
								'h-8 animate-pulse rounded-lg',
								isRail ? 'bg-white/[0.07]' : 'bg-foreground/5'
							)}
						></div>
					{/each}
				{:else if recent.length === 0}
					<p
						class={cn('px-2.5 py-2 text-caption', isRail ? 'text-white/40' : 'text-muted-foreground')}
					>
						{t.nav.noWorkbooks}
					</p>
				{:else}
					{#each recent as workbook (workbook.id)}
						{@const active = isActive(`/workbooks/${workbook.id}`)}
						<a
							href={`/workbooks/${workbook.id}`}
							onclick={onNavigate}
							aria-current={active ? 'page' : undefined}
							class={cn(
								'flex h-8 items-center gap-2.5 rounded-lg px-2.5 transition-colors',
								isRail
									? active
										? 'bg-white/15 text-white ring-1 ring-white/10'
										: 'text-white/65 hover:bg-white/10 hover:text-white'
									: active
										? 'bg-background shadow-2xs ring-1 ring-border'
										: 'hover:bg-background/80'
							)}
						>
							<span class="grid w-5 shrink-0 place-items-center">
								<span
									class={cn('size-1.5 rounded-full', statusTone(workbook.status))}
									aria-hidden="true"
								></span>
							</span>
							<span class="min-w-0 flex-1 truncate text-caption">{workbook.name}</span>
						</a>
					{/each}
				{/if}
			</div>
		</div>
	{/if}
</div>
