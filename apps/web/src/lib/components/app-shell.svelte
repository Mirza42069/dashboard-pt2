<script lang="ts" module>
	export type ShellUser = {
		name: string;
		email: string;
		role: string;
		trialEndsAt: Date | string | null;
	};
</script>

<script lang="ts">
	import type { Snippet } from 'svelte';
	import * as Resizable from '@DashboardPT2/ui/components/resizable';
	import { Button } from '@DashboardPT2/ui/components/button';
	import { PanelRight, Sparkles } from '@DashboardPT2/ui/components/icons';
	import * as Tooltip from '@DashboardPT2/ui/components/tooltip';

	import { getT } from '../../i18n/context.svelte';
	import {
		clampAgentPanelSize,
		MAX_AGENT_PANEL_SIZE,
		MIN_AGENT_PANEL_SIZE,
		writeAgentPanelCookie,
		type AgentPanelState
	} from '../agent-panel';
	import { writeSidebarCookie } from '../sidebar';
	import type { TextScale } from '../text-scale';
	import AgentPanel from './agent-panel/agent-panel.svelte';
	import AppSidebar from './app-sidebar.svelte';
	import CommandPalette from './command-palette.svelte';
	import Header from './header.svelte';
	import SkipLink from './skip-link.svelte';

	let {
		user,
		initialCollapsed,
		initialTextScale,
		initialAgentPanel,
		children
	}: {
		user: ShellUser;
		initialCollapsed: boolean;
		initialTextScale: TextScale;
		initialAgentPanel: AgentPanelState;
		children: Snippet;
	} = $props();

	const t = getT();

	// svelte-ignore state_referenced_locally
	let collapsed = $state(initialCollapsed);
	// svelte-ignore state_referenced_locally
	let panel = $state<AgentPanelState>({ ...initialAgentPanel });

	function toggleSidebar() {
		collapsed = !collapsed;
		writeSidebarCookie(collapsed);
	}

	function toggleAgentPanel() {
		panel = { ...panel, collapsed: !panel.collapsed };
		writeAgentPanelCookie(panel);
	}

	/**
	 * paneforge reports the whole group's layout, not one pane's size, and it
	 * fires on every animation frame of a drag. Only the agent pane's share is
	 * worth keeping, and only once it has actually moved — writing an identical
	 * cookie sixty times a second is how a drag becomes janky.
	 */
	function onLayoutChange(layout: number[]) {
		const next = clampAgentPanelSize(layout[1] ?? panel.size);
		if (Math.round(next) === Math.round(panel.size)) return;
		panel = { ...panel, size: next };
		writeAgentPanelCookie(panel);
	}
</script>

<div data-app-shell class="flex h-svh overflow-hidden bg-surface-shell">
	<SkipLink />
	<AppSidebar {collapsed} />

	<div class="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden border-l border-border bg-background">
		<Header
			{user}
			{collapsed}
			{initialTextScale}
			agentPanelCollapsed={panel.collapsed}
			onToggleSidebar={toggleSidebar}
			onToggleAgentPanel={toggleAgentPanel}
		/>

		<Resizable.PaneGroup direction="horizontal" class="min-h-0 flex-1" {onLayoutChange}>
			<Resizable.Pane order={1} class="flex min-h-0 min-w-0 flex-col">
				<!--
					The shell no longer forks on the route. It used to: the workbook
					workspace wanted full bleed and no header, so the shell special-cased
					`/workbooks/*` to strip its own padding and rounding. That put a page's
					layout preference inside the chrome, where every new full-bleed screen
					would have had to be added to the condition by hand.

					Now the shell is always full bleed and padding is the page's business —
					which is exactly what PageShell already is. Screens that want a measured
					column wrap themselves in it; the grid does not.
				-->
				<main id="main" tabindex="-1" class="min-h-0 flex-1 overflow-y-auto outline-none">
					{@render children()}
				</main>
			</Resizable.Pane>

			{#if !panel.collapsed}
				<Resizable.Handle
					class="w-px bg-border transition-colors hover:bg-brand/40 data-[active=pointer]:bg-brand"
				/>
				<Resizable.Pane
					order={2}
					defaultSize={panel.size}
					minSize={MIN_AGENT_PANEL_SIZE}
					maxSize={MAX_AGENT_PANEL_SIZE}
					class="flex min-h-0 min-w-0 flex-col"
				>
					<AgentPanel onCollapse={toggleAgentPanel} />
				</Resizable.Pane>
			{/if}
		</Resizable.PaneGroup>
	</div>

	{#if panel.collapsed}
		<!--
			Collapsed, the panel leaves the pane group entirely rather than shrinking
			to a zero-width pane. A collapsed paneforge pane still owns a resize
			handle, so the rail would stay draggable while showing nothing — this way
			the only way back is the button, which is what a collapsed rail should be.
		-->
		<aside
			class="hidden w-10 shrink-0 flex-col items-center gap-1 border-l border-border bg-surface-panel py-2 md:flex"
		>
			<Tooltip.Root>
				<Tooltip.Trigger>
					{#snippet child({ props })}
						<Button
							{...props}
							variant="ghost"
							size="icon-sm"
							onclick={toggleAgentPanel}
							aria-label={t.agentPanel.expand}
						>
							<Sparkles class="text-brand" />
						</Button>
					{/snippet}
				</Tooltip.Trigger>
				<Tooltip.Content side="left">{t.agentPanel.expand}</Tooltip.Content>
			</Tooltip.Root>
			<span class="mt-1 h-px w-4 bg-border"></span>
			<PanelRight class="mt-1 size-3.5 text-muted-foreground/60" />
		</aside>
	{/if}

	<CommandPalette />
</div>
