<script lang="ts">
	import {
		CircleCheckIcon,
		InfoIcon,
		Loader2Icon,
		OctagonXIcon,
		TriangleAlertIcon
	} from "@DashboardPT2/ui/components/icons";
	import { Toaster as Sonner, type ToasterProps as SonnerProps } from "svelte-sonner";

	/**
	 * Theme is passed in by the app, which reads it from a cookie server-side.
	 *
	 * Deliberately not mode-watcher, which shadcn-svelte wires up by default:
	 * that reads localStorage and the system preference in the browser, which is
	 * the flash-then-correct behaviour lib/theme.ts exists to avoid. One source
	 * of truth for the theme, and it is the cookie.
	 */
	let { theme = "light", ...restProps }: SonnerProps = $props();
</script>

<!--
	position/offset are defaults, not hard-coded: both sit before {...restProps}
	so a call site can still override them.

	Sonner's own default is bottom-right, which puts notifications in the corner
	furthest from where anything is triggered here — actions live in the header
	and in table rows near the top of the page.

	The offset clears the 3rem header rather than floating over it. Toasts are
	allowed to overlap content, but the header holds the sidebar toggle and
	company switcher, and a toast landing on top of the control that just fired
	it is the one overlap worth avoiding.

	mobileOffset is not redundant. Sonner writes the two into separate custom
	properties and falls back to its own 16px below the mobile breakpoint, so
	`offset` alone is a desktop-only setting — on a phone the toast would land
	back on top of the header this is meant to clear.
-->
<Sonner
	{theme}
	position="top-center"
	offset="4rem"
	mobileOffset="4rem"
	class="toaster group"
	style="--normal-bg: var(--popover); --normal-text: var(--popover-foreground); --normal-border: var(--border); --border-radius: var(--radius);"
	{...restProps}
>
	{#snippet loadingIcon()}
		<Loader2Icon class="size-4 animate-spin" />
	{/snippet}
	{#snippet successIcon()}
		<CircleCheckIcon class="size-4" />
	{/snippet}
	{#snippet errorIcon()}
		<OctagonXIcon class="size-4" />
	{/snippet}
	{#snippet infoIcon()}
		<InfoIcon class="size-4" />
	{/snippet}
	{#snippet warningIcon()}
		<TriangleAlertIcon class="size-4" />
	{/snippet}
</Sonner>
