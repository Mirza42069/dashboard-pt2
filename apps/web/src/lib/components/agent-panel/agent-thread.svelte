<script lang="ts">
	import { Button } from '@DashboardPT2/ui/components/button';
	import * as DropdownMenu from '@DashboardPT2/ui/components/dropdown-menu';
	import { ChevronsUpDown, Loader2, Plus, Sparkles } from '@DashboardPT2/ui/components/icons';
	import { createMutation, createQuery, useQueryClient } from '@tanstack/svelte-query';
	import { page } from '$app/state';

	import { getT } from '../../../i18n/context.svelte';
	import type { UserAttachment } from '../../agent-body';
	import { markLive, takeLive } from '../../chat-live.svelte';
	import { client } from '../../orpc';
	import { toast } from '../../toast';
	import { useFormat } from '../../use-format.svelte';
	import Composer from '../chat/composer.svelte';
	import Turn from '../chat/turn.svelte';

	type Conversation = {
		id: string;
		title: string;
		messages: { id: string; role: string; body: unknown }[];
	};

	const t = getT();
	const { formatDateTime } = useFormat();
	const queryClient = useQueryClient();

	/**
	 * Lives in the panel, not the URL.
	 *
	 * The panel is mounted by the (app) layout, so this survives every navigation
	 * inside the app — which is the point of moving the agent out of its own
	 * route. Asking a question on one workbook and then opening another must not
	 * throw the answer away.
	 */
	let activeId = $state<string | null>(null);
	let draft = $state('');
	let liveMessageId = $state<string | null>(null);
	let scroller = $state<HTMLDivElement | null>(null);
	const reconciliationId = $derived(
		page.route.id === '/(app)/workbooks/[id]' ? page.params.id : undefined
	);

	const threads = createQuery(() => ({
		queryKey: ['chat', 'conversations'],
		queryFn: () => client.chat.conversations.list({ limit: 30 })
	}));

	const thread = createQuery(() => ({
		queryKey: ['chat', 'conversation', activeId],
		queryFn: () => client.chat.conversations.get({ id: activeId! }) as Promise<Conversation>,
		enabled: Boolean(activeId)
	}));

	const send = createMutation(() => ({
		mutationFn: (input: { text: string; attachments: UserAttachment[] }) =>
			client.chat.conversations.send(
				activeId
					? { ...input, conversationId: activeId, reconciliationId }
					: { ...input, reconciliationId }
			),
		onSuccess: (conversation) => {
			activeId = conversation.id;
			queryClient.setQueryData(['chat', 'conversation', conversation.id], conversation);
			void queryClient.invalidateQueries({ queryKey: ['chat', 'conversations'] });
			const answer = conversation.messages.at(-1);
			if (answer) {
				markLive(answer.id);
				liveMessageId = takeLive();
			}
			scrollToEnd();
		},
		onError: () => toast.error(t.chat.sendFailed)
	}));

	function scrollToEnd() {
		queueMicrotask(() => {
			requestAnimationFrame(() => scroller?.scrollTo({ top: scroller.scrollHeight }));
		});
	}

	function startNew() {
		activeId = null;
		liveMessageId = null;
		draft = '';
	}

	function open(id: string) {
		activeId = id;
		liveMessageId = null;
		scrollToEnd();
	}

	const messages = $derived(thread.data?.messages ?? []);
	const items = $derived(threads.data?.items ?? []);
	const suggestions = $derived([
		t.chat.suggestReconcile,
		t.chat.suggestExceptions,
		t.chat.suggestStatus,
		t.chat.suggestLarge
	]);
</script>

<div class="flex min-h-0 flex-1 flex-col">
	<div class="flex h-8 shrink-0 items-center gap-1 border-b border-border px-2">
		<DropdownMenu.Root>
			<DropdownMenu.Trigger>
				{#snippet child({ props })}
					<Button {...props} variant="ghost" size="xs" class="min-w-0 flex-1 justify-start gap-1">
						<span class="truncate">{thread.data?.title ?? t.agentPanel.newRun}</span>
						<ChevronsUpDown class="ml-auto size-3 shrink-0 text-muted-foreground" />
					</Button>
				{/snippet}
			</DropdownMenu.Trigger>
			<DropdownMenu.Content align="start" class="max-h-80 w-64 overflow-y-auto">
				<DropdownMenu.Label class="text-caption tracking-wide uppercase">
					{t.agentPanel.pastRuns}
				</DropdownMenu.Label>
				{#if items.length === 0}
					<p class="px-2 py-3 text-caption text-muted-foreground">{t.agentPanel.noRuns}</p>
				{:else}
					{#each items as item (item.id)}
						<DropdownMenu.Item onSelect={() => open(item.id)} class="flex-col items-start gap-0.5">
							<span class="w-full truncate text-xs">{item.title}</span>
							<span class="text-caption text-muted-foreground tabular-nums">
								{formatDateTime(item.updatedAt)}
							</span>
						</DropdownMenu.Item>
					{/each}
				{/if}
			</DropdownMenu.Content>
		</DropdownMenu.Root>

		<Button
			variant="ghost"
			size="icon-xs"
			onclick={startNew}
			aria-label={t.agentPanel.newRun}
			title={t.agentPanel.newRun}
		>
			<Plus />
		</Button>
	</div>

	<div bind:this={scroller} class="min-h-0 flex-1 overflow-y-auto px-3 py-4">
		{#if !activeId}
			<div class="space-y-3">
				<div class="flex flex-col gap-1.5">
					{#each suggestions as suggestion (suggestion)}
						<button
							type="button"
							onclick={() => (draft = suggestion)}
							class="rounded-md border border-border bg-background px-2.5 py-1.5 text-left text-xs text-muted-foreground transition-colors hover:border-brand/40 hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
						>
							{suggestion}
						</button>
					{/each}
				</div>
			</div>
		{:else if thread.isPending}
			<div class="grid place-items-center py-8">
				<Loader2 class="size-4 animate-spin text-muted-foreground" />
			</div>
		{:else}
			<div class="space-y-6">
				{#each messages as message (message.id)}
					<Turn role={message.role} body={message.body} live={message.id === liveMessageId} />
				{/each}
			</div>
		{/if}

		{#if send.isPending}
			<div
				class="mt-6 border-l-2 border-brand/30 pl-3 motion-safe:animate-in motion-safe:fade-in"
				role="status"
				aria-live="polite"
			>
				<p class="flex items-center gap-1.5 text-caption font-medium tracking-wide text-brand uppercase">
					<Loader2 class="size-3 animate-spin" />
					{t.agent.working}
				</p>
			</div>
		{/if}
	</div>

	<div class="shrink-0 border-t border-border p-2">
		<Composer
			bind:value={draft}
			compact
			pending={send.isPending}
			onSend={(text, attachments) => {
				send.mutate({ text, attachments });
				scrollToEnd();
			}}
		/>
	</div>
</div>
