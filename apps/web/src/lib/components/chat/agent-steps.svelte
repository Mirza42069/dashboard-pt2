<script lang="ts">
	import { Check, ChevronDown } from '@DashboardPT2/ui/components/icons';
	import { cn } from '@DashboardPT2/ui/lib/utils';

	import { interpolate } from '../../../i18n';
	import { getT } from '../../../i18n/context.svelte';
	import { agentDurationSeconds, agentStepLabel, type AgentBody } from '../../agent-body';

	let { body, live = false }: { body: AgentBody; live?: boolean } = $props();

	const t = getT();
	const seconds = $derived(agentDurationSeconds(body));

	/**
	 * Open on a live run, closed on a thread read back.
	 *
	 * Watching the work happen is the point the first time; on a reload it is
	 * history, and the answer should be the first thing on the page rather than
	 * the fourth. The disclosure stays so the run can always be re-opened.
	 */
	// svelte-ignore state_referenced_locally
	// Deliberately the initial value: whether a run is new is decided once, when
	// the turn first renders, and must not change under the reader afterwards.
	let open = $state(live);
</script>

{#if body.steps.length > 0}
	<div class="rounded-lg border bg-muted/30">
		<button
			type="button"
			onclick={() => (open = !open)}
			aria-expanded={open}
			class="flex w-full items-center gap-2 px-3 py-2 text-caption text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
		>
			<ChevronDown
				class={cn('size-3.5 shrink-0 transition-transform duration-200', !open && '-rotate-90')}
			/>
			<span class="font-medium tracking-wide uppercase">{t.agent.steps}</span>
			<span class="ml-auto tabular-nums">{interpolate(t.agent.ranIn, { seconds })}</span>
		</button>

		{#if open}
			<ol class="space-y-0.5 border-t px-3 py-2">
				{#each body.steps as step, index (step.key + index)}
					<!--
						Staggered only on a live run. Replaying the reveal every time a
						thread is opened would make reading history feel like waiting.
						`animation-delay` is inline because the count is data-driven and
						Tailwind cannot ship a class it never saw in the source.
					-->
					<li
						class={cn(
							'flex items-center gap-2 py-1 text-xs',
							live && 'motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-left-2'
						)}
						style={live ? `animation-delay:${index * 90}ms;animation-fill-mode:backwards` : undefined}
					>
						<span
							class="grid size-4 shrink-0 place-items-center rounded-full bg-success/15 text-success"
						>
							<Check class="size-2.5" />
						</span>
						<span class="min-w-0 flex-1 truncate text-muted-foreground">
							{agentStepLabel(t, step)}
						</span>
						<span class="shrink-0 text-caption text-muted-foreground/70 tabular-nums">
							{interpolate(t.agent.duration, { ms: step.ms })}
						</span>
					</li>
				{/each}
			</ol>
		{/if}
	</div>
{/if}
