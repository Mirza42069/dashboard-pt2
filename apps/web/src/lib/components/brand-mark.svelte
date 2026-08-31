<script lang="ts">
	import { cn } from "@DashboardPT2/ui/lib/utils";

	import { BRAND_NAME } from "./brand";

	let { size = "sm", class: className }: { size?: "sm" | "lg"; class?: string } = $props();
</script>

<span
	role="img"
	aria-label={BRAND_NAME}
	class={cn("inline-flex shrink-0", size === "lg" ? "size-10" : "size-6", className)}
>
	<svg viewBox="0 0 48 48" class="size-full text-brand" aria-hidden="true">
		<g
			fill="none"
			stroke="currentColor"
			stroke-linecap="round"
			stroke-linejoin="round"
		>
			<path d="M11 29l10 9 17-26" stroke-width="5" />
			<path d="M11 42h27" stroke-width="3" />
		</g>
	</svg>
</span>
