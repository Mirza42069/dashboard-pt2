<script lang="ts">
	import { Button } from "@DashboardPT2/ui/components/button";
	import { FileSpreadsheet, Paperclip, Send, X } from "@DashboardPT2/ui/components/icons";
	import { cn } from "@DashboardPT2/ui/lib/utils";

	import { interpolate } from "../../../i18n";
	import { getT } from "../../../i18n/context.svelte";
	import type { UserAttachment } from "../../agent-body";

	let {
		pending = false,
		autofocus = false,
		compact = false,
		value = $bindable(""),
		onSend,
	}: {
		pending?: boolean;
		autofocus?: boolean;
		/**
		 * The agent panel's version. Same control, less of it: a shorter box, no
		 * attachment label, and the footnote dropped. At panel width the note wrapped
		 * to three lines and pushed the composer off the bottom of the rail.
		 */
		compact?: boolean;
		value?: string;
		onSend: (text: string, attachments: UserAttachment[]) => void;
	} = $props();

	const t = getT();
	let attachments = $state<UserAttachment[]>([]);
	let fileInput = $state<HTMLInputElement | null>(null);
	let textarea = $state<HTMLTextAreaElement | null>(null);

	function resize() {
		if (!textarea) return;
		textarea.style.height = "auto";
		textarea.style.height = `${Math.min(textarea.scrollHeight, 220)}px`;
	}

	function submit() {
		const text = value.trim();
		if (!text || pending) return;
		onSend(text, attachments);
		value = "";
		attachments = [];
		queueMicrotask(resize);
	}

	function pick(event: Event) {
		const input = event.currentTarget as HTMLInputElement;
		attachments = [
			...attachments,
			...Array.from(input.files ?? []).map((file) => ({
				name: file.name,
				sizeBytes: file.size,
				type: file.type || "application/octet-stream",
			})),
		].slice(0, 10);
		input.value = "";
	}
</script>

<div class="space-y-2">
	<div
		class={cn(
			"overflow-hidden rounded-lg border border-border bg-background transition-colors",
			"focus-within:border-brand/50 focus-within:ring-2 focus-within:ring-brand/10",
		)}
	>
		{#if attachments.length > 0}
			<ul class="flex flex-wrap gap-1.5 border-b bg-muted/20 px-3 py-2">
				{#each attachments as file, index (file.name + index)}
					<li class="inline-flex items-center gap-1.5 rounded-md border border-brand/20 bg-brand/8 px-2 py-1 text-caption text-foreground">
						<FileSpreadsheet class="size-3 shrink-0" />
						<span class="max-w-48 truncate">{file.name}</span>
						<button
							type="button"
							class="rounded-sm hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
							aria-label={interpolate(t.chat.removeAttachment, { name: file.name })}
							onclick={() => (attachments = attachments.filter((_, itemIndex) => itemIndex !== index))}
						>
							<X class="size-3" />
						</button>
					</li>
				{/each}
			</ul>
		{/if}

		<!-- svelte-ignore a11y_autofocus -->
		<textarea
			bind:this={textarea}
			bind:value
			{autofocus}
			rows="1"
			placeholder={t.chat.placeholder}
			aria-label={t.chat.placeholder}
			oninput={resize}
			onkeydown={(event) => {
				if (event.key === "Enter" && !event.shiftKey) {
					event.preventDefault();
					submit();
				}
			}}
			class={cn(
				"w-full resize-none bg-transparent outline-none placeholder:text-muted-foreground/75",
				compact
					? "max-h-[140px] min-h-12 px-2.5 py-2 text-xs leading-5"
					: "max-h-[220px] min-h-20 px-4 py-3 text-sm leading-6"
			)}
		></textarea>

		<div class="flex items-center justify-between gap-2 border-t bg-muted/20 px-2 py-2">
			<input
				bind:this={fileInput}
				type="file"
				multiple
				accept=".xlsx,.xls,.csv,.tsv,.pdf,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel,text/csv,application/pdf"
				class="sr-only"
				tabindex="-1"
				onchange={pick}
			/>
			<div class="flex min-w-0 items-center gap-1.5">
				<Button
					variant="ghost"
					size="sm"
					type="button"
					class="h-8 text-muted-foreground hover:text-foreground"
					onclick={() => fileInput?.click()}
					aria-label={t.chat.attach}
					title={t.chat.attachNote}
				>
					<Paperclip />
					{#if !compact}<span class="hidden sm:inline">{t.chat.attach}</span>{/if}
				</Button>
			</div>
			<Button
				size="icon-sm"
				class="size-8 rounded-full"
				type="button"
				disabled={pending || value.trim() === ""}
				onclick={submit}
				aria-label={pending ? t.chat.sending : t.chat.send}
			>
				<Send class="size-3.5" />
			</Button>
		</div>
	</div>
</div>
