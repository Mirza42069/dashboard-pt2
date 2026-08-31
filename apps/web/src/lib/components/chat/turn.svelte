<script lang="ts">
	import { Paperclip, Sparkles } from '@DashboardPT2/ui/components/icons';

	import { getT } from '../../../i18n/context.svelte';
	import {
		agentSentence,
		normalizeAgentBody,
		normalizeUserBody,
		type AgentBody
	} from '../../agent-body';
	import { useFormat } from '../../use-format.svelte';
	import AgentSteps from './agent-steps.svelte';
	import ResultCard from './result-card.svelte';

	let {
		role,
		body,
		live = false
	}: { role: string; body: unknown; live?: boolean } = $props();

	const t = getT();
	const { amountIn } = useFormat();

	const user = $derived(role === 'USER' ? normalizeUserBody(body) : null);
	const agent = $derived<AgentBody | null>(role === 'AGENT' ? normalizeAgentBody(body) : null);
	const sentence = $derived(
		agent ? agentSentence(t, agent, { threshold: (value, currency) => amountIn(value, currency) }) : ''
	);
</script>

{#if user}
	<!--
		The question, kept quiet. It is the shorter half of the exchange and the
		reader already knows what they asked; the answer is what the eye should
		land on.
	-->
	<div class="ml-auto w-full">
		<p class="mb-1 text-right text-caption font-medium tracking-wide text-muted-foreground uppercase">
			{t.chat.you}
		</p>
		<div class="rounded-xl rounded-tr-sm border bg-muted/40 px-4 py-3">
			<p class="text-sm whitespace-pre-wrap">{user.text}</p>
			{#if user.attachments.length > 0}
				<ul class="mt-2 flex flex-wrap gap-1.5 border-t pt-2">
					{#each user.attachments as file, index (file.name + index)}
						<li
							class="inline-flex items-center gap-1.5 text-caption text-muted-foreground"
						>
							<Paperclip class="size-3 shrink-0" />
							<span class="max-w-48 truncate">{file.name}</span>
						</li>
					{/each}
				</ul>
			{/if}
		</div>
	</div>
{:else if agent}
	<!--
		The answer, as page content rather than a bubble. The agent is producing
		work, not chatting back, and the brand-tinted rule down the left is what
		marks the block as its output without wrapping it in a speech shape.
	-->
	<div class="border-l-2 border-brand/30 pl-3">
		<p class="mb-2 flex items-center gap-1.5 text-caption font-medium tracking-wide text-brand uppercase">
			<Sparkles class="size-3" />
			{t.chat.title}
		</p>
		<div class="space-y-3">
			<AgentSteps body={agent} {live} />
			<p class="text-xs leading-5 text-pretty">{sentence}</p>
			<ResultCard result={agent.result} />
		</div>
	</div>
{/if}
