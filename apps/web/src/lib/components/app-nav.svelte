<script lang="ts">
	import { Button } from '@DashboardPT2/ui/components/button';
	import { FileCode2, FileSpreadsheet, Plus, Upload } from '@DashboardPT2/ui/components/icons';
	import * as Tooltip from '@DashboardPT2/ui/components/tooltip';
	import { cn } from '@DashboardPT2/ui/lib/utils';
	import { page } from '$app/state';

	import { getT } from '../../i18n/context.svelte';

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

	function isActive(href: string) {
		return page.url.pathname === href || page.url.pathname.startsWith(`${href}/`);
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
</div>
