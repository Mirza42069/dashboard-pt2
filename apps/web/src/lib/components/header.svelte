<script lang="ts">
	import { Button } from '@DashboardPT2/ui/components/button';
	import { PanelRight } from '@DashboardPT2/ui/components/icons';
	import * as Tooltip from '@DashboardPT2/ui/components/tooltip';
	import { cn } from '@DashboardPT2/ui/lib/utils';
	import { page } from '$app/state';

	import { getT } from '../../i18n/context.svelte';
	import type { TextScale } from '../text-scale';
	import ActivityPopover from './activity-popover.svelte';
	import type { ShellUser } from './app-shell.svelte';
	import MobileNav from './mobile-nav.svelte';
	import UserMenu from './user-menu.svelte';

	let {
		user,
		initialTextScale,
		agentPanelCollapsed,
		onToggleAgentPanel
	}: {
		user: ShellUser;
		initialTextScale: TextScale;
		agentPanelCollapsed: boolean;
		onToggleAgentPanel: () => void;
	} = $props();

	const t = getT();
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
		<h1 class="truncate text-xs font-semibold tracking-tight">{title}</h1>
	</div>

	<div class="flex shrink-0 items-center gap-1">
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
