<script lang="ts">
	import { PanelLeft } from '@DashboardPT2/ui/components/icons';
	import * as Tooltip from '@DashboardPT2/ui/components/tooltip';
	import { cn } from "@DashboardPT2/ui/lib/utils";

	import { getT } from '../../i18n/context.svelte';
	import AppNav from "./app-nav.svelte";

	let { collapsed, onToggle }: { collapsed: boolean; onToggle: () => void } = $props();
	const t = getT();
	const toggleLabel = $derived(collapsed ? t.nav.expandSidebar : t.nav.collapseSidebar);
</script>

<aside
	class={cn(
		"relative hidden shrink-0 flex-col overflow-hidden bg-black pt-1.5 text-white transition-[width] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] md:flex",
		collapsed ? "w-14" : "w-56",
	)}
>
	<div class="flex h-9 shrink-0 items-center px-2">
		<Tooltip.Root>
			<Tooltip.Trigger>
				{#snippet child({ props })}
					<button
						{...props}
						type="button"
						onclick={onToggle}
						aria-label={toggleLabel}
						aria-expanded={!collapsed}
						class="grid size-10 place-items-center rounded-full text-white/60 outline-none transition-colors hover:bg-white/10 hover:text-white focus-visible:ring-2 focus-visible:ring-white/70"
					>
						<PanelLeft class="size-4" />
					</button>
				{/snippet}
			</Tooltip.Trigger>
			<Tooltip.Content side="right">{toggleLabel}</Tooltip.Content>
		</Tooltip.Root>
	</div>
	<div class="flex min-h-0 flex-1 flex-col overflow-hidden px-2 pb-3">
		<AppNav {collapsed} appearance="rail" />
	</div>
</aside>
