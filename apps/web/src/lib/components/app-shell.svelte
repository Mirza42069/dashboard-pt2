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

<div data-app-shell class="flex h-svh overflow-hidden bg-black">
	<SkipLink />
	<AppSidebar {collapsed} onToggle={toggleSidebar} />

	<div
		class="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden bg-background md:my-1.5 md:mr-1.5 md:rounded-[1.5rem] md:ring-1 md:ring-white/10"
	>
		<Header
			{user}
			{initialTextScale}
			agentPanelCollapsed={panel.collapsed}
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

	<!--
		Collapsed, the panel leaves the pane group entirely rather than shrinking to
		a zero-width pane: a collapsed paneforge pane still owns a resize handle, so
		the rail would stay draggable while showing nothing. It leaves no stub
		behind either — a square-cornered strip outside the rounded card only broke
		the card's edge, and the header's own toggle is already the way back in.
	-->
</div>
