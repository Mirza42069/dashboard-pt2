<script lang="ts">
	import { Button } from '@DashboardPT2/ui/components/button';
	import { PanelRight, Sparkles, TriangleAlert } from '@DashboardPT2/ui/components/icons';
	import { cn } from '@DashboardPT2/ui/lib/utils';

	import { getT } from '../../../i18n/context.svelte';
	import { workbookInspector } from '../../workbook-inspector.svelte';
	import AgentThread from './agent-thread.svelte';
	import IssueInspector from './issue-inspector.svelte';

	let { onCollapse }: { onCollapse: () => void } = $props();

	const t = getT();
	const inspector = $derived(workbookInspector());

	type Tab = 'agent' | 'issues';
	let requested = $state<Tab>('agent');

	/**
	 * The Issues tab only exists on a workbook. Navigating away from one while it
	 * is showing must not leave the panel on a tab with nothing behind it, so the
	 * rendered tab is derived rather than stored — `requested` is what the reader
	 * last chose, and this is what that resolves to given where they now are.
	 */
	const tab = $derived<Tab>(inspector ? requested : 'agent');
	const issueCount = $derived(inspector?.issues.length ?? 0);
</script>

<aside class="flex min-h-0 flex-1 flex-col bg-surface-panel">
	<div class="flex h-9 shrink-0 items-center gap-2 border-b border-border px-2">
		<span class="grid size-5 shrink-0 place-items-center rounded-md bg-ink-strong text-background">
			<Sparkles class="size-3" />
		</span>

		{#if inspector}
			<div class="flex min-w-0 items-center gap-0.5" role="tablist">
				{#each [{ id: 'agent' as const, label: t.agentPanel.tabAgent }, { id: 'issues' as const, label: t.agentPanel.tabIssues }] as item (item.id)}
					<button
						type="button"
						role="tab"
						aria-selected={tab === item.id}
						onclick={() => (requested = item.id)}
						class={cn(
							'flex h-6 items-center gap-1 rounded-md px-2 text-caption font-medium transition-colors',
							tab === item.id
								? 'bg-background text-foreground shadow-2xs'
								: 'text-muted-foreground hover:text-foreground'
						)}
					>
						{item.label}
						{#if item.id === 'issues' && issueCount > 0}
							<span class="tabular-nums text-destructive">{issueCount}</span>
						{/if}
					</button>
				{/each}
			</div>
		{:else}
			<p class="min-w-0 flex-1 truncate text-xs font-semibold">{t.agentPanel.title}</p>
		{/if}

		<Button
			variant="ghost"
			size="icon-xs"
			class="ml-auto"
			onclick={onCollapse}
			aria-label={t.agentPanel.collapse}
			title={t.agentPanel.collapse}
		>
			<PanelRight />
		</Button>
	</div>

	{#if tab === 'issues' && inspector}
		<IssueInspector {inspector} />
	{:else}
		<AgentThread />
	{/if}
</aside>
