<script lang="ts">
	import { Button } from "@DashboardPT2/ui/components/button";
	import { ArrowRight, Check, Icon, Pencil, X } from "@DashboardPT2/ui/components/icons";

	import type { PendingEdit } from "../lib/tools";
	import { t } from "../lib/i18n";

	let {
		edits,
		status,
		onApply,
		onDiscard,
	}: {
		edits: PendingEdit[];
		status: "pending" | "applied" | "discarded";
		onApply: () => void;
		onDiscard: () => void;
	} = $props();
</script>

<!--
	The approval gate, and the only thing in the thread that asks for a decision
	— so it is the only thing built as a card. Everything else the agent produces
	is flat text or a muted activity group; this one lifts off the page with a
	shadow and a header, because the difference between "here is what I found"
	and "may I change your spreadsheet" should not be a matter of reading
	carefully.

	Corners are concentric: the card is rounded-lg (12px) and its sections run
	flush to the edge, so nothing inside needs a radius of its own.

	Each row shows the current value beside the proposed one, because overwriting
	a number is a different decision from filling a blank and the row has to make
	that visible without being read word by word.
-->
<div
	class="animate-in fade-in slide-in-from-bottom-1 overflow-hidden rounded-lg border bg-card shadow-sm duration-200 ease-out"
>
	<div class="flex items-center gap-1.5 border-b px-2.5 py-1.5">
		<Icon icon={Pencil} class="size-3 shrink-0 text-brand" />
		<p class="min-w-0 flex-1 truncate text-xs font-medium">
			{t("edits.title", { count: edits.length })}
		</p>
	</div>

	<div class="divide-y">
		{#each edits as edit (edit.sheet + ":" + edit.ref)}
			<div class="flex items-baseline gap-2 px-2.5 py-1.5">
				<span class="shrink-0 font-mono text-caption text-muted-foreground">
					{#if edit.sheet}{edit.sheet}!{/if}{edit.ref}
				</span>
				<span class="flex min-w-0 flex-1 items-baseline gap-1.5 text-xs">
					<span class="min-w-0 truncate font-mono text-muted-foreground line-through">
						{edit.current || t("edits.blank")}
					</span>
					<Icon icon={ArrowRight} class="size-3 shrink-0 self-center text-muted-foreground" />
					<span class="min-w-0 truncate font-mono font-medium">{edit.next}</span>
				</span>
			</div>
		{/each}
	</div>

	<div class="flex items-center gap-1.5 border-t bg-muted/40 px-2.5 py-1.5">
		{#if status === "pending"}
			<Button size="xs" onclick={onApply}>{t("edits.apply")}</Button>
			<Button variant="ghost" size="xs" onclick={onDiscard}>{t("edits.discard")}</Button>
		{:else if status === "applied"}
			<!--
				Colour is never the only signal: the tick carries the same meaning for
				anyone who cannot separate the green from the grey.
			-->
			<p class="flex items-center gap-1 text-caption font-medium text-success">
				<Icon icon={Check} class="size-3" />
				{t("edits.applied")}
			</p>
		{:else}
			<p class="flex items-center gap-1 text-caption text-muted-foreground">
				<Icon icon={X} class="size-3" />
				{t("edits.discarded")}
			</p>
		{/if}
	</div>
</div>
