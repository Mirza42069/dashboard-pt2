<script lang="ts">
	import { Badge } from "@DashboardPT2/ui/components/badge";
	import { Bubble } from "@DashboardPT2/ui/components/bubble";
	import { Button } from "@DashboardPT2/ui/components/button";
	import {
		Empty,
		EmptyContent,
		EmptyDescription,
		EmptyHeader,
		EmptyMedia,
		EmptyTitle,
	} from "@DashboardPT2/ui/components/empty";
	import {
		ArrowUp,
		Check,
		ChevronRight,
		FileSpreadsheet,
		Icon,
		RefreshCw,
		Sparkles,
		TriangleAlert,
	} from "@DashboardPT2/ui/components/icons";
	import {
		InputGroup,
		InputGroupAddon,
		InputGroupText,
		InputGroupTextarea,
	} from "@DashboardPT2/ui/components/input-group";
	import { Kbd } from "@DashboardPT2/ui/components/kbd";
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

	/** Enter sends, Shift+Enter breaks the line — the composer is a textarea. */
	function onComposerKeydown(event: KeyboardEvent) {
		if (event.key !== "Enter" || event.shiftKey) return;
		event.preventDefault();
		void send(question);
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
	<!--
		Two lines of chrome, and no more: who this is, then what it is looking at.
		Refresh sits on the sheet line rather than in the header because that is
		the thing it acts on — and as an icon it gives the thread back the ~40px
		a labelled button was spending.
	-->
	<header class="flex h-11 shrink-0 items-center gap-2 border-b px-3">
		<span
			class="flex size-5 shrink-0 items-center justify-center rounded-md bg-brand text-brand-foreground"
			aria-hidden="true"
		>
			<Icon icon={Check} class="size-3" />
		</span>
		<span class="text-sm font-semibold tracking-tight">{t("brand")}</span>
		<Badge variant={isInExcel() ? "default" : "secondary"} class="ml-auto text-caption">
			{sheetBadge()}
		</Badge>
	</header>

	<div
		class="flex h-8 shrink-0 items-center gap-1.5 border-b bg-muted/30 px-3 text-caption text-muted-foreground"
	>
		<Icon icon={FileSpreadsheet} class="size-3 shrink-0" />
		{#if sheet}
			<p class="min-w-0 flex-1 truncate">
				<span class="font-medium text-foreground">{sheet.name}</span>
				· {t("sheet.rows", { rows: sheet.rows.length, cols: sheet.headers.length })}
			</p>
		{:else}
			<p class="min-w-0 flex-1 truncate">{t("loading")}</p>
		{/if}
		<Button
			variant="ghost"
			size="icon-xs"
			class="-mr-1 shrink-0"
			disabled={readingSheet}
			onclick={refreshSheet}
			aria-label={t("sheet.refresh")}
			title={readingSheet ? t("sheet.refreshing") : t("sheet.refresh")}
		>
			{#if readingSheet}
				<Spinner class="size-3" />
			{:else}
				<Icon icon={RefreshCw} class="size-3" />
			{/if}
		</Button>
	</div>

	<MessageScroller
		bind:this={scroller}
		jumpLabel={t("thread.jumpToLatest")}
		logLabel={t("thread.log")}
		class="space-y-3 px-3 py-3"
	>
		{#if turns.length === 0}
			<Empty class="gap-3 p-4">
				<EmptyHeader>
					<EmptyMedia variant="icon" class="mb-0 size-8 rounded-md">
						<Icon icon={Sparkles} class="size-4 text-brand" />
					</EmptyMedia>
					<EmptyTitle>{t("thread.emptyTitle")}</EmptyTitle>
					<EmptyDescription class="text-xs">{t("thread.empty")}</EmptyDescription>
				</EmptyHeader>
				<EmptyContent class="gap-1.5">
					{#each suggestions as suggestion (suggestion)}
						<Button
							variant="outline"
							size="xs"
							class="w-full justify-between"
							onclick={() => send(suggestion)}
						>
							{suggestion}
							<Icon icon={ChevronRight} class="text-muted-foreground" />
						</Button>
					{/each}
				</EmptyContent>
			</Empty>
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
							class="mt-0.5 flex size-5 items-center justify-center rounded-md border bg-background text-brand"
							aria-hidden="true"
						>
							<Icon icon={Sparkles} class="size-3" />
						</span>
					{/snippet}

					<div class="space-y-2">
						{#if turn.failed}
							<Marker class="text-destructive" role="alert">
								{#snippet icon()}
									<Icon icon={TriangleAlert} />
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

							<!--
								Completed steps stay muted. Green on every tick made a
								five-step run a wall of colour and left nothing for the one
								state that has earned it — a fix actually written to a cell.
							-->
							{#each body.steps.slice(0, turn.revealed) as step (step.key + String(step.ms))}
								<Marker>
									{#snippet icon()}
										<Icon icon={Check} />
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
							<Badge variant="outline" class="text-caption">
								{turn.body.source === "llm" ? t("source.llm") : t("source.script")}
							</Badge>
						{/if}
					{/snippet}
				</Message>
			{/if}
		{/each}
	</MessageScroller>

	<div class="shrink-0 border-t p-2.5">
		<form
			onsubmit={(event) => {
				event.preventDefault();
				void send(question);
			}}
		>
			<InputGroup>
				<!--
					text-xs, overriding the primitive's text-base. The 16px default is
					iOS' zoom guard, and this pane is a desktop taskpane where it only
					made a two-line placeholder out of a one-line question.
				-->
				<InputGroupTextarea
					rows={1}
					class="max-h-32 min-h-0 text-xs"
					placeholder={t("composer.placeholder")}
					maxlength={2000}
					disabled={pending}
					onkeydown={onComposerKeydown}
					bind:value={question}
				/>
				<InputGroupAddon align="block-end">
					<InputGroupText class="text-caption">
						<Kbd>↵</Kbd>
						{t("composer.hint")}
					</InputGroupText>
					<Button
						type="submit"
						size="icon-xs"
						class="ml-auto"
						disabled={pending || !question.trim()}
						aria-label={t("composer.send")}
					>
						{#if pending}
							<Spinner class="size-3" />
						{:else}
							<Icon icon={ArrowUp} class="size-3" />
						{/if}
					</Button>
				</InputGroupAddon>
			</InputGroup>
		</form>
	</div>
</div>
