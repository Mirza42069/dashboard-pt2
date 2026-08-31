<script lang="ts">
	import { Button } from '@DashboardPT2/ui/components/button';
	import { ChevronLeft, PanelRight } from '@DashboardPT2/ui/components/icons';
	import { Kbd } from '@DashboardPT2/ui/components/kbd';
	import * as Tooltip from '@DashboardPT2/ui/components/tooltip';
	import { cn } from '@DashboardPT2/ui/lib/utils';
	import { page } from '$app/state';

	import { getT } from '../../i18n/context.svelte';
	import { toggleCommandPalette } from '../command-palette.svelte';
	import type { TextScale } from '../text-scale';
	import ActivityPopover from './activity-popover.svelte';
	import type { ShellUser } from './app-shell.svelte';
	import CompanySwitcher from './company-switcher.svelte';
	import MobileNav from './mobile-nav.svelte';
	import UserMenu from './user-menu.svelte';

	let {
		user,
		collapsed,
		initialTextScale,
		agentPanelCollapsed,
		onToggleSidebar,
		onToggleAgentPanel
	}: {
		user: ShellUser;
		collapsed: boolean;
		initialTextScale: TextScale;
		agentPanelCollapsed: boolean;
		onToggleSidebar: () => void;
		onToggleAgentPanel: () => void;
	} = $props();

	const t = getT();
	const sidebarLabel = $derived(collapsed ? t.nav.expandSidebar : t.nav.collapseSidebar);
	const panelLabel = $derived(
		agentPanelCollapsed ? t.agentPanel.expand : t.agentPanel.collapse
	);

	/**
	 * The section, not the record.
	 *
	 * A workbook's own name is its page's business — the grid puts it in a
	 * breadcrumb beside the source filename and the data version, which is more
	 * than a single line of chrome can carry. This says where in the app you are.
	 */
	const title = $derived.by(() => {
		const path = page.url.pathname;
		if (path.startsWith('/workbooks')) return t.nav.workbooks;
		if (path.startsWith('/imports')) return t.nav.imports;
		if (path.startsWith('/tax-reports')) return t.nav.taxReports;
		return t.nav.workbooks;
	});
</script>

<header
	class="flex h-9 shrink-0 items-center justify-between gap-3 border-b border-border bg-background px-2 md:px-3"
>
	<div class="flex min-w-0 items-center gap-1.5">
		<MobileNav />
		<Tooltip.Root>
			<Tooltip.Trigger>
				{#snippet child({ props })}
					<Button
						{...props}
						variant="ghost"
						size="icon-xs"
						class="hidden text-muted-foreground md:inline-flex"
						aria-label={sidebarLabel}
						onclick={onToggleSidebar}
					>
						<ChevronLeft
							class={cn('transition-transform duration-500', collapsed && 'rotate-180')}
						/>
					</Button>
				{/snippet}
			</Tooltip.Trigger>
			<Tooltip.Content side="bottom">{sidebarLabel}</Tooltip.Content>
		</Tooltip.Root>
		<div class="hidden h-4 w-px bg-border md:block"></div>
		<h1 class="truncate text-xs font-semibold tracking-tight">{title}</h1>
	</div>

	<div class="flex shrink-0 items-center gap-1">
		<Tooltip.Root>
			<Tooltip.Trigger>
				{#snippet child({ props })}
					<button
						{...props}
						type="button"
						class="hidden h-6 items-center gap-1.5 rounded-md border border-border px-2 text-caption text-muted-foreground transition-colors hover:text-foreground lg:inline-flex"
						onclick={toggleCommandPalette}
					>
						{t.palette.open}
						<Kbd>⌘K</Kbd>
					</button>
				{/snippet}
			</Tooltip.Trigger>
			<Tooltip.Content side="bottom">{t.palette.title}</Tooltip.Content>
		</Tooltip.Root>

		<div class="hidden lg:flex"><CompanySwitcher /></div>
		<ActivityPopover />
		<UserMenu {user} {initialTextScale} />

		<div class="h-4 w-px bg-border"></div>
		<Tooltip.Root>
			<Tooltip.Trigger>
				{#snippet child({ props })}
					<Button
						{...props}
						variant="ghost"
						size="icon-xs"
						class={cn('text-muted-foreground', !agentPanelCollapsed && 'text-brand')}
						aria-label={panelLabel}
						aria-pressed={!agentPanelCollapsed}
						onclick={onToggleAgentPanel}
					>
						<PanelRight />
					</Button>
				{/snippet}
			</Tooltip.Trigger>
			<Tooltip.Content side="bottom">{panelLabel}</Tooltip.Content>
		</Tooltip.Root>
	</div>
</header>
