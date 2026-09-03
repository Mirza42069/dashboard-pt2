<script lang="ts">
	import { ArrowDownIcon } from "@DashboardPT2/ui/components/icons";
	import { cn, type WithElementRef } from "@DashboardPT2/ui/lib/utils.js";
	import type { HTMLAttributes } from "svelte/elements";

	let {
		ref = $bindable(null),
		class: className,
		/**
		 * Accessible name for the scroll viewport (role="log").
		 */
		logLabel = "Conversation",
		/**
		 * Accessible label for the floating jump-to-latest button.
		 */
		jumpLabel = "Jump to latest",
		children,
		...restProps
	}: WithElementRef<HTMLAttributes<HTMLDivElement>> & {
		logLabel?: string;
		jumpLabel?: string;
	} = $props();

	/**
	 * The scroll container for a conversation. Ported from the shadcn/ui
	 * message-scroller primitive: it owns anchoring (stick to the bottom while
	 * the reader is at the bottom, release the moment they scroll up), a
	 * jump-to-latest affordance, and scroll-aware edge fade. It does not own
	 * the messages — the caller renders any content into the default snippet
	 * and every DOM change re-evaluates the anchor.
	 */

	let viewport = $state<HTMLElement | null>(null);
	let atBottom = $state(true);

	/** Distance from the bottom that still counts as "reading the latest". */
	const BOTTOM_THRESHOLD = 48;

	function syncAtBottom() {
		if (!viewport) return;
		atBottom =
			viewport.scrollHeight - viewport.scrollTop - viewport.clientHeight <= BOTTOM_THRESHOLD;
	}

	/** Scroll to the newest message. Exposed for the composer: sending while scrolled up should jump back. */
	export function scrollToBottom(options?: { smooth?: boolean }) {
		if (!viewport) return;
		const reduce =
			typeof matchMedia === "function" &&
			matchMedia("(prefers-reduced-motion: reduce)").matches;
		viewport.scrollTo({
			top: viewport.scrollHeight,
			behavior: options?.smooth && !reduce ? "smooth" : "auto",
		});
	}

	$effect(() => {
		if (!viewport) return;
		syncAtBottom();
		// Content growth (new messages, revealed steps, streamed text) re-anchors
		// only while the reader is at the bottom; scrolled-up readers keep their
		// place and get the jump button instead.
		const observer = new MutationObserver(() => {
			if (atBottom && viewport) viewport.scrollTop = viewport.scrollHeight;
		});
		observer.observe(viewport, { childList: true, subtree: true, characterData: true });
		return () => observer.disconnect();
	});
</script>

<div
	bind:this={ref}
	data-slot="message-scroller"
	class="relative min-h-0 flex-1"
	{...restProps}
>
	<!-- class lands on the scroll area so callers space the messages themselves -->
	<div
		bind:this={viewport}
		role="log"
		aria-label={logLabel}
		onscroll={syncAtBottom}
		class={cn("scroll-fade-b h-full overflow-y-auto", className)}
	>
		{@render children?.()}
	</div>

	{#if !atBottom}
		<button
			type="button"
			aria-label={jumpLabel}
			title={jumpLabel}
			onclick={() => scrollToBottom({ smooth: true })}
			class="absolute right-3 bottom-3 z-10 inline-flex size-7 items-center justify-center rounded-full border bg-background text-muted-foreground shadow-md transition-colors hover:text-foreground"
		>
			<ArrowDownIcon class="size-3.5" />
		</button>
	{/if}
</div>
