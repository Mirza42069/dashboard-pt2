<script lang="ts">
	import { Badge } from "@DashboardPT2/ui/components/badge";
	import { Bubble } from "@DashboardPT2/ui/components/bubble";
	import { Button } from "@DashboardPT2/ui/components/button";
	import { CheckIcon, TriangleAlertIcon } from "@DashboardPT2/ui/components/icons";
	import { Input } from "@DashboardPT2/ui/components/input";
	import { Marker } from "@DashboardPT2/ui/components/marker";
	import { Message } from "@DashboardPT2/ui/components/message";
	import { MessageScroller } from "@DashboardPT2/ui/components/message-scroller";
	import { Spinner } from "@DashboardPT2/ui/components/spinner";

	import type { AddinAgentBody } from "../lib/agent";

	import { t } from "../lib/i18n";
	import { applyFixes, isInExcel, readSheet, sheetBadge, type SheetSnapshot } from "../lib/office";
	import { runAgent } from "../lib/agent";
	import IssueList from "./IssueList.svelte";

	/**
	 * The agent's answer arrives whole, but is revealed the way it was
	 * produced: steps appear one by one over `body.steps[].ms`, then the
	 * findings and prose. `revealed` counts steps shown; `body` is null until
	 * the run resolves.
	 */
	type AgentTurn = {
		role: "agent";
		body: AddinAgentBody | null;
		revealed: number;
		failed: boolean;
	};
	type Turn = { role: "user"; text: string } | AgentTurn;

	/** Display pace for the step timeline, scaled down from the real timings. */
	const REVEAL_MS = 420;

	function delay(ms: number) {
		return new Promise<void>((resolve) => setTimeout(resolve, ms));
	}

	let sheet = $state<SheetSnapshot | null>(null);
	let readingSheet = $state(false);
	let turns = $state<Turn[]>([]);
	let pending = $state(false);
	let question = $state("");
	let applied = $state(new Set<string>());
	let scroller = $state<{ scrollToBottom(options?: { smooth?: boolean }): void } | null>(null);

	async function refreshSheet() {
		readingSheet = true;
		try {
			sheet = await readSheet();
		} finally {
			readingSheet = false;
		}
	}

	$effect(() => {
		void refreshSheet();
	});

	async function send(text: string) {
		const trimmed = text.trim();
		if (!trimmed || pending) return;

		turns.push({ role: "user", text: trimmed });
		turns.push({ role: "agent", body: null, revealed: 0, failed: false });
		const turn = turns.at(-1) as AgentTurn;
		question = "";
		pending = true;
		scroller?.scrollToBottom({ smooth: true });
		try {
			const snapshot = await readSheet();
			sheet = snapshot;
			const body = await runAgent(trimmed, {
				name: snapshot.name,
				headers: snapshot.headers,
				rows: snapshot.rows,
			});
			turn.body = body;
			pending = false;
			for (let index = 0; index < body.steps.length; index++) {
				await delay(index === 0 ? 180 : REVEAL_MS);
				turn.revealed = index + 1;
			}
		} catch (error) {
			console.error(error);
			turn.failed = true;
			pending = false;
		}
	}

	async function applyIssue(issue: { ref: string; expected: string | null }) {
		if (!issue.expected) return;
		await applyFixes([{ ref: issue.ref, value: issue.expected }]);
		applied = new Set([...applied, issue.ref]);
	}

	const suggestions = $derived([
		t("thread.suggestion.validate"),
		t("thread.suggestion.summarize"),
		t("thread.suggestion.coretax"),
	]);
</script>

<div class="flex h-full flex-col">
	<header class="flex items-center gap-2 border-b px-3 py-2.5">
		<span class="size-2 shrink-0 rounded-full bg-brand" aria-hidden="true"></span>
		<span class="text-sm font-semibold tracking-tight">{t("brand")}</span>
		<Badge variant={isInExcel() ? "default" : "secondary"} class="text-[10px]">
			{sheetBadge()}
		</Badge>
	</header>

	<div class="flex items-center gap-2 border-b bg-muted/40 px-3 py-2 text-xs">
		<div class="min-w-0 flex-1">
			{#if sheet}
				<p class="truncate font-medium">{sheet.name}</p>
				<p class="text-muted-foreground">
					{t("sheet.rows", { rows: sheet.rows.length, cols: sheet.headers.length })}
				</p>
			{:else}
				<p class="text-muted-foreground">{t("loading")}</p>
			{/if}
		</div>
		<Button variant="ghost" size="xs" disabled={readingSheet} onclick={refreshSheet}>
			{#if readingSheet}
				<Spinner class="size-3" />
			{/if}
			{readingSheet ? t("sheet.refreshing") : t("sheet.refresh")}
		</Button>
	</div>

	<MessageScroller
		bind:this={scroller}
		jumpLabel={t("thread.jumpToLatest")}
		logLabel={t("thread.log")}
		class="space-y-3 px-3 py-3"
	>
		{#if turns.length === 0}
			<div class="space-y-2.5 pt-2">
				<p class="text-xs leading-relaxed text-muted-foreground">{t("thread.empty")}</p>
				<div class="flex flex-wrap gap-1.5">
					{#each suggestions as suggestion (suggestion)}
						<Button variant="outline" size="xs" onclick={() => send(suggestion)}>
							{suggestion}
						</Button>
					{/each}
				</div>
			</div>
		{/if}

		{#each turns as turn, index (index)}
			{#if turn.role === "user"}
				<Message align="end">
					<Bubble variant="secondary" align="end">{turn.text}</Bubble>
				</Message>
			{:else}
				<Message>
					{#snippet avatar()}
						<span
							class="mt-0.5 flex size-5 items-center justify-center rounded-full bg-ink-strong text-[10px] font-semibold text-background"
							aria-hidden="true"
						>
							T
						</span>
					{/snippet}

					<div class="space-y-2">
						{#if turn.failed}
							<Marker class="text-destructive" role="alert">
								{#snippet icon()}
									<TriangleAlertIcon />
								{/snippet}
								{t("error.generic")}
							</Marker>
						{:else if !turn.body}
							<Marker pending>
								{#snippet icon()}
									<Spinner />
								{/snippet}
								{t("thread.working")}
							</Marker>
						{:else}
							{@const body = turn.body}
							{@const inFlight = body.steps[turn.revealed]}

							{#each body.steps.slice(0, turn.revealed) as step (step.key + String(step.ms))}
								<Marker>
									{#snippet icon()}
										<CheckIcon class="text-success" />
									{/snippet}
									{t(`step.${step.key}`, step.params)}
								</Marker>
							{/each}

							{#if inFlight}
								<Marker pending>
									{#snippet icon()}
										<Spinner />
									{/snippet}
									{t(`step.${inFlight.key}`, inFlight.params)}
								</Marker>
							{/if}

							{#if turn.revealed >= body.steps.length}
								{#if body.issues.length > 0}
									<div class="space-y-1">
										<p class="text-xs font-medium">
											{t("issues.title", { count: body.issues.length })}
										</p>
										<IssueList issues={body.issues} {applied} onApply={applyIssue} />
									</div>
								{/if}

								{#if body.answer}
									<p class="text-sm leading-relaxed">{body.answer}</p>
								{/if}
							{/if}
						{/if}
					</div>

					{#snippet footer()}
						{#if turn.body && turn.revealed >= turn.body.steps.length}
							<Badge variant="outline" class="text-[10px]">
								{turn.body.source === "llm" ? t("source.llm") : t("source.script")}
							</Badge>
						{/if}
					{/snippet}
				</Message>
			{/if}
		{/each}
	</MessageScroller>

	<div class="space-y-2 border-t p-2.5">
		<form
			class="flex items-center gap-2"
			onsubmit={(event) => {
				event.preventDefault();
				void send(question);
			}}
		>
			<Input
				placeholder={t("composer.placeholder")}
				maxlength={2000}
				disabled={pending}
				bind:value={question}
			/>
			<Button type="submit" size="sm" disabled={pending || !question.trim()}>
				{t("composer.send")}
			</Button>
		</form>
	</div>
</div>
