<script lang="ts">
	import { Button } from "@DashboardPT2/ui/components/button";
	import { Eye, EyeOff } from "@DashboardPT2/ui/components/icons";
	import { Input } from "@DashboardPT2/ui/components/input";
	import { cn } from "@DashboardPT2/ui/lib/utils";
	import type { HTMLInputAttributes } from "svelte/elements";

	import { getT } from "../../i18n/context.svelte";

	/**
	 * Password field with a show/hide eye. The toggle is tabindex="-1" so
	 * keyboard flow stays field → submit; mouse and touch users can still reveal
	 * what they typed.
	 */
	let {
		class: className,
		value = $bindable(),
		...restProps
		// Input's own props are a union over its file and non-file branches; a
		// password field is never a file input, so narrow to plain attributes.
	}: Omit<HTMLInputAttributes, "type" | "files"> = $props();

	const t = getT();
	let visible = $state(false);
</script>

<div class="relative">
	<Input type={visible ? "text" : "password"} class={cn("pr-9", className)} bind:value {...restProps} />
	<Button
		type="button"
		variant="ghost"
		size="icon-sm"
		tabindex={-1}
		aria-label={visible ? t.common.hidePassword : t.common.showPassword}
		class="absolute top-1/2 right-1 -translate-y-1/2 text-muted-foreground hover:bg-transparent"
		onclick={() => (visible = !visible)}
	>
		{#if visible}<EyeOff />{:else}<Eye />{/if}
	</Button>
</div>
