<script lang="ts">
	import { onMount } from "svelte";

	import { Badge } from "@DashboardPT2/ui/components/badge";
	import { Bubble } from "@DashboardPT2/ui/components/bubble";
	import { Button } from "@DashboardPT2/ui/components/button";
	import {
		Collapsible,
		CollapsibleContent,
		CollapsibleTrigger,
	} from "@DashboardPT2/ui/components/collapsible";
	import {
		Empty,
		EmptyContent,
		EmptyDescription,
		EmptyHeader,
		EmptyMedia,
		EmptyTitle,
	} from "@DashboardPT2/ui/components/empty";
	import { IconSwap, IconSwapItem } from "@DashboardPT2/ui/components/icon-swap";
	import {
		ArrowUp,
		Check,
		ChevronRight,
		Copy,
		FileSpreadsheet,
		Icon,
		RefreshCw,
		Sparkles,
		TriangleAlert,
		X,
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

	import { Agent, type ApprovalRequest, type Decision } from "../lib/agent";
	import { t } from "../lib/i18n";
	import { activeSheet, isInExcel, sheetBadge, type SheetInfo } from "../lib/office";
	import type { PendingEdit } from "../lib/tools";
	import EditList from "./EditList.svelte";

	/**
	 * The thread renders what actually happened, in the order it happened.
	 *
	 * A turn is a list of blocks rather than a fixed shape, because the agent
	 * interleaves them freely: it may write a sentence, call two tools, write
	 * another sentence, then propose an edit. Text deltas append to the trailing
	 * text block; anything else starts a new one. There is no simulated progress
	 * anywhere in here — a row is spinning because the call is genuinely
	 * outstanding.
	 */
	type TextBlock = { kind: "text"; value: string };
	type ToolBlock = {
		kind: "tool";
		id: string;
		label: string;
		args: unknown;
		status: "running" | "ok" | "error";
		summary: string;
		detail: string;
	};
	type EditBlock = {
		kind: "edit";
		id: string;
		edits: PendingEdit[];
		status: "pending" | "applied" | "discarded";
	};
	type Block = TextBlock | ToolBlock | EditBlock;

	type AgentTurn = {
		role: "agent";
		blocks: Block[];
		reasoning: string;
		error: string | null;
		streaming: boolean;
		stopped: boolean;
	};
	type Turn = { role: "user"; text: string } | AgentTurn;

	/**
	 * Consecutive tool calls render as one group rather than as loose lines.
	 *
	 * A run that lists the sheets, reads two of them and searches a column is
	 * four separate rows, and as siblings in a flat stack they read as four
	 * unrelated statements with the answer buried underneath. Collected into a
	 * single tinted panel they read as what they are — one stretch of the agent
	 * working — and the prose that follows is clearly the reply.
	 */
	type Group = TextBlock | EditBlock | { kind: "tools"; items: ToolBlock[] };

	function groupBlocks(blocks: Block[]): Group[] {
		const groups: Group[] = [];
		for (const block of blocks) {
			if (block.kind !== "tool") {
				groups.push(block);
				continue;
			}
			const last = groups.at(-1);
			if (last?.kind === "tools") last.items.push(block);
			else groups.push({ kind: "tools", items: [block] });
		}
		return groups;
	}

	const agent = new Agent();

	let sheet = $state<SheetInfo | null>(null);
	let readingSheet = $state(false);
	let turns = $state<Turn[]>([]);
	let question = $state("");
	let pending = $state(false);
	let copiedTurn = $state<number | null>(null);
	let controller: AbortController | null = null;
	/** Resolver for the write the agent is currently blocked on, if any. */
	let awaitingApproval: ((decision: Decision) => void) | null = null;
	let scroller = $state<{ scrollToBottom(options?: { smooth?: boolean }): void } | null>(null);

	async function refreshSheet() {
		readingSheet = true;
		try {
			sheet = await activeSheet();
		} catch {
			sheet = null;
		} finally {
			readingSheet = false;
		}
	}

	onMount(refreshSheet);

	function pushText(turn: AgentTurn, delta: string) {
		const last = turn.blocks.at(-1);
		if (last?.kind === "text") last.value += delta;
		else turn.blocks.push({ kind: "text", value: delta });
	}

	function findBlock<T extends Block["kind"]>(
		turn: AgentTurn,
		kind: T,
		id: string,
	): Extract<Block, { kind: T }> | undefined {
		return turn.blocks.find(
			(block): block is Extract<Block, { kind: T }> =>
				block.kind === kind && "id" in block && block.id === id,
		);
	}

	async function send(text: string) {
		const trimmed = text.trim();
		if (!trimmed || pending) return;

		if (!agent.hasModel) {
			turns.push({ role: "user", text: trimmed });
			turns.push({
				role: "agent",
				blocks: [],
				reasoning: "",
				error: t("error.noModel"),
				streaming: false,
				stopped: false,
			});
			question = "";
			return;
		}

		turns.push({ role: "user", text: trimmed });
		turns.push({
			role: "agent",
			blocks: [],
			reasoning: "",
			error: null,
			streaming: true,
			stopped: false,
		});
		const turn = turns.at(-1) as AgentTurn;
		question = "";
		pending = true;
		controller = new AbortController();
		scroller?.scrollToBottom({ smooth: true });

		try {
			for await (const event of agent.send(trimmed, {
				signal: controller.signal,
				requestApproval: (request: ApprovalRequest) =>
					new Promise<Decision>((resolve) => {
						turn.blocks.push({
							kind: "edit",
							id: request.id,
							edits: request.edits,
							status: "pending",
						});
						scroller?.scrollToBottom({ smooth: true });
						awaitingApproval = resolve;
					}),
			})) {
				switch (event.type) {
					case "reasoning":
						turn.reasoning += event.delta;
						break;
					case "text":
						pushText(turn, event.delta);
						break;
					case "tool_start":
						turn.blocks.push({
							kind: "tool",
							id: event.id,
							label: event.label,
							args: event.args,
							status: "running",
							summary: "",
							detail: "",
						});
						break;
					case "tool_end": {
						const block = findBlock(turn, "tool", event.id);
						if (block) {
							block.status = event.ok ? "ok" : "error";
							block.summary = event.summary;
							block.detail = event.detail;
						}
						break;
					}
					case "approval_end": {
						const block = findBlock(turn, "edit", event.id);
						if (block) block.status = event.applied ? "applied" : "discarded";
						if (event.applied) void refreshSheet();
						break;
					}
					case "error":
						turn.error =
							event.message === "no-key"
								? t("error.noModel")
								: t("error.model", { detail: event.message });
						break;
				}
			}
		} catch (error) {
			console.error(error);
			turn.error = t("error.generic");
		} finally {
			turn.streaming = false;
			pending = false;
			controller = null;
			awaitingApproval = null;
		}
	}

	function resolveApproval(turn: AgentTurn, id: string, decision: Decision) {
		const block = findBlock(turn, "edit", id);
		if (!block || block.status !== "pending") return;
		const resolve = awaitingApproval;
		awaitingApproval = null;
		resolve?.(decision);
	}

	function stop() {
		const turn = turns.at(-1);
		if (turn?.role === "agent") turn.stopped = true;
		controller?.abort();
		// A run blocked on an approval has no request in flight to cancel, so the
		// pending write is discarded to let the loop unwind.
		awaitingApproval?.("discard");
		awaitingApproval = null;
	}

	/** The agent's prose, without the tool rows — what is worth putting on a clipboard. */
	async function copyTurn(turn: AgentTurn, index: number) {
		const prose = turn.blocks
			.filter((block): block is TextBlock => block.kind === "text")
			.map((block) => block.value)
			.join("\n\n")
			.trim();
		if (!prose) return;
		try {
			await navigator.clipboard.writeText(prose);
			copiedTurn = index;
			setTimeout(() => {
				if (copiedTurn === index) copiedTurn = null;
			}, 1_600);
		} catch {
			// A clipboard the host refuses is not worth an error state in the thread.
		}
	}

	/** Enter sends, Shift+Enter breaks the line — the composer is a textarea. */
	function onComposerKeydown(event: KeyboardEvent) {
		if (event.key !== "Enter" || event.shiftKey) return;
		event.preventDefault();
		void send(question);
	}

	const suggestions = $derived([
		t("thread.suggestion.overview"),
		t("thread.suggestion.checks"),
		t("thread.suggestion.selection"),
	]);
</script>

<div class="flex h-full flex-col">
	<!--
		Two lines of chrome, and no more: who this is, then what it is looking at.
		Refresh sits on the sheet line rather than in the header because that is
		the thing it acts on.
	-->
	<header class="flex h-11 shrink-0 items-center gap-2 border-b px-3">
		<span
			class="flex size-5 shrink-0 items-center justify-center rounded-md bg-brand text-brand-foreground shadow-xs"
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
				· {sheet.rowCount
					? t("sheet.rows", { rows: sheet.rowCount, cols: sheet.columnCount })
					: t("sheet.empty")}
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
			<IconSwap class="size-3">
				<IconSwapItem active={readingSheet}><Spinner class="size-3" /></IconSwapItem>
				<IconSwapItem active={!readingSheet}><Icon icon={RefreshCw} class="size-3" /></IconSwapItem>
			</IconSwap>
		</Button>
	</div>

	<MessageScroller
		bind:this={scroller}
		jumpLabel={t("thread.jumpToLatest")}
		logLabel={t("thread.log")}
		class="space-y-4 px-3 py-3"
	>
		{#if turns.length === 0}
			<Empty class="gap-3 p-4">
				<EmptyHeader>
					<EmptyMedia variant="icon" class="mb-0 size-8 rounded-lg bg-brand/10">
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
							class="group/suggestion w-full justify-between"
							onclick={() => send(suggestion)}
						>
							{suggestion}
							<!--
								The chevron nudges rather than animating in: it is already
								there, so the hover only has to acknowledge the pointer.
							-->
							<Icon
								icon={ChevronRight}
								class="text-muted-foreground transition-transform duration-150 ease-out group-hover/suggestion:translate-x-0.5"
							/>
						</Button>
					{/each}
				</EmptyContent>
			</Empty>
		{/if}

		{#each turns as turn, index (index)}
			{#if turn.role === "user"}
				<Message align="end">
					<Bubble variant="secondary" align="end" class="shadow-xs">{turn.text}</Bubble>
				</Message>
			{:else}
				{@const groups = groupBlocks(turn.blocks)}
				{@const hasProse = turn.blocks.some((block) => block.kind === "text")}
				<Message>
					{#snippet avatar()}
						<span
							class="mt-0.5 flex size-5 items-center justify-center rounded-md bg-brand/10 text-brand"
							aria-hidden="true"
						>
							<Icon icon={Sparkles} class="size-3" />
						</span>
					{/snippet}

					<div class="space-y-2.5">
						{#if turn.reasoning}
							<!--
								Folded away by default. It is the model's scratch work, not
								its answer, and in a 300px pane it would otherwise bury the
								answer under itself.
							-->
							<Collapsible>
								<CollapsibleTrigger
									class="group/thinking -mx-1 flex items-center gap-1 rounded-md px-1 py-0.5 text-caption text-muted-foreground transition-colors duration-150 hover:text-foreground"
								>
									<Icon
										icon={ChevronRight}
										class="size-3 transition-transform duration-200 ease-out group-data-[state=open]/thinking:rotate-90"
									/>
									{t("thread.thinking")}
								</CollapsibleTrigger>
								<CollapsibleContent>
									<p
										class="mt-1 ml-1 border-l pl-2 text-caption whitespace-pre-wrap text-muted-foreground"
									>
										{turn.reasoning}
									</p>
								</CollapsibleContent>
							</Collapsible>
						{/if}

						{#each groups as group, groupIndex (groupIndex)}
							{#if group.kind === "text"}
								<p class="text-sm leading-relaxed whitespace-pre-wrap">{group.value}</p>
							{:else if group.kind === "tools"}
								<!--
									The activity panel. Tinted rather than bordered: this is
									background work, and a border here would compete with the
									edit card, which is the one thing in the thread that has
									earned an outline.

									Corners are concentric — 12px outside, 4px of padding, 8px
									on the rows — so the rows sit inside the panel instead of
									looking pinched against it.
								-->
								<div
									class="animate-in fade-in slide-in-from-bottom-1 space-y-px rounded-lg bg-muted/50 p-1 duration-200 ease-out"
								>
									{#each group.items as tool (tool.id)}
										<Collapsible>
											<CollapsibleTrigger
												disabled={!tool.detail}
												class="group/tool flex w-full items-start gap-2 rounded-sm px-2 py-1.5 text-left transition-colors duration-150 not-disabled:hover:bg-background/70 disabled:cursor-default"
											>
												<!--
													Spinner to tick without a flicker: every state is
													already in the DOM, only opacity, scale and blur
													move. The status is also carried by the row's
													colour and its summary text, never by motion alone.
												-->
												<IconSwap class="mt-0.5 size-3">
													<IconSwapItem active={tool.status === "running"}>
														<Spinner class="size-3" />
													</IconSwapItem>
													<IconSwapItem active={tool.status === "ok"}>
														<Icon icon={Check} class="size-3 text-success" />
													</IconSwapItem>
													<IconSwapItem active={tool.status === "error"}>
														<Icon icon={TriangleAlert} class="size-3 text-destructive" />
													</IconSwapItem>
												</IconSwap>

												<span class="min-w-0 flex-1 text-xs leading-relaxed">
													<span
														class={tool.status === "error"
															? "text-destructive"
															: "text-foreground"}
														class:shimmer={tool.status === "running"}
													>
														{tool.label}
													</span>
													{#if tool.summary}
														<span class="text-muted-foreground"> — {tool.summary}</span>
													{/if}
												</span>

												<Icon
													icon={ChevronRight}
													aria-hidden="true"
													class="mt-0.5 size-3 shrink-0 text-muted-foreground opacity-0 transition-[opacity,rotate] duration-200 ease-out group-data-[state=open]/tool:rotate-90 {tool.detail
														? 'opacity-100'
														: ''}"
												/>
											</CollapsibleTrigger>

											{#if tool.detail}
												<CollapsibleContent>
													<!--
														The raw call and its raw result, exactly as they
														went to and came from the model. This is the
														receipt for the line above it.
													-->
													<dl
														class="mt-px max-h-44 space-y-1.5 overflow-auto rounded-sm bg-background/70 px-2 py-1.5 font-mono text-caption"
													>
														<div>
															<dt class="text-muted-foreground">{t("tool.request")}</dt>
															<dd class="break-all">{JSON.stringify(tool.args)}</dd>
														</div>
														<div>
															<dt class="text-muted-foreground">{t("tool.response")}</dt>
															<dd class="break-all">{tool.detail}</dd>
														</div>
													</dl>
												</CollapsibleContent>
											{/if}
										</Collapsible>
									{/each}
								</div>
							{:else}
								<EditList
									edits={group.edits}
									status={group.status}
									onApply={() => resolveApproval(turn, group.id, "apply")}
									onDiscard={() => resolveApproval(turn, group.id, "discard")}
								/>
							{/if}
						{/each}

						{#if turn.error}
							<Marker variant="bordered" class="text-destructive" role="alert">
								{#snippet icon()}
									<Icon icon={TriangleAlert} />
								{/snippet}
								{turn.error}
							</Marker>
						{:else if turn.stopped && !turn.streaming}
							<Marker>
								{#snippet icon()}
									<Icon icon={X} />
								{/snippet}
								{t("thread.stopped")}
							</Marker>
						{:else if turn.streaming && turn.blocks.length === 0}
							<Marker pending>
								{#snippet icon()}
									<Spinner />
								{/snippet}
								{t("thread.working")}
							</Marker>
						{/if}
					</div>

					{#snippet footer()}
						{#if hasProse && !turn.streaming}
							{@const isCopied = copiedTurn === index}
							<Button
								variant="ghost"
								size="xs"
								class="-ml-2 text-caption text-muted-foreground"
								onclick={() => copyTurn(turn, index)}
							>
								<IconSwap class="size-3">
									<IconSwapItem active={isCopied}>
										<Icon icon={Check} class="size-3" />
									</IconSwapItem>
									<IconSwapItem active={!isCopied}>
										<Icon icon={Copy} class="size-3" />
									</IconSwapItem>
								</IconSwap>
								{isCopied ? t("thread.copied") : t("thread.copy")}
							</Button>
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
					onkeydown={onComposerKeydown}
					bind:value={question}
				/>
				<InputGroupAddon align="block-end">
					<InputGroupText class="text-caption">
						<Kbd>↵</Kbd>
						{t("composer.hint")}
					</InputGroupText>
					<!--
						One button, two jobs. Swapping the whole control for a different
						one would move focus and lose the press state mid-generation, so
						the button stays put and only its icon, colour and label change.
					-->
					<Button
						type={pending ? "button" : "submit"}
						variant={pending ? "secondary" : "default"}
						size="icon-xs"
						class="ml-auto"
						disabled={!pending && !question.trim()}
						onclick={pending ? stop : undefined}
						aria-label={pending ? t("composer.stop") : t("composer.send")}
						title={pending ? t("composer.stop") : t("composer.send")}
					>
						<IconSwap class="size-3">
							<IconSwapItem active={pending}><Icon icon={X} class="size-3" /></IconSwapItem>
							<IconSwapItem active={!pending}><Icon icon={ArrowUp} class="size-3" /></IconSwapItem>
						</IconSwap>
					</Button>
				</InputGroupAddon>
			</InputGroup>
		</form>
	</div>
</div>
