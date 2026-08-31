<script lang="ts" module>
	export type ShellUser = {
		name: string;
		email: string;
		role: string;
		/** Null on a normal account. Drives the trial badge in the top bar. */
		trialEndsAt: Date | string | null;
	};
</script>

<script lang="ts">
	import type { Snippet } from "svelte";

	import { writeSidebarCookie } from "../sidebar";
	import type { TextScale } from "../text-scale";
	import AppSidebar from "./app-sidebar.svelte";
	import Header from "./header.svelte";
	import SkipLink from "./skip-link.svelte";

	/**
	 * Owns the sidebar collapse state so the trigger can live in the topbar while
	 * the sidebar itself reacts. Initial value comes from a cookie read on the
	 * server, so there is no expand-then-collapse flash.
	 */
	let {
		user,
		initialCollapsed,
		initialTextScale,
		children
	}: {
		user: ShellUser;
		initialCollapsed: boolean;
		initialTextScale: TextScale;
		children: Snippet;
	} = $props();

	// svelte-ignore state_referenced_locally
	// Deliberately the initial value: the server resolved it from the cookie,
	// and this component owns the state from here on.
	let collapsed = $state(initialCollapsed);
	function toggle() {
		collapsed = !collapsed;
		writeSidebarCookie(collapsed);
	}
</script>

<!--
	overflow-hidden matches the reference layout and matters more than it looks:
	nav labels keep their full natural width while collapsed and are only clipped
	by the rail, so without this a horizontal scrollbar can flicker in and out
	across the one-second slide.

	Both axes, not just x. `overflow-x: hidden` with `overflow-y: visible` is not
	a thing CSS will give you — the spec computes the visible axis to `auto` — so
	this element would silently be a vertical scroll container. It is exactly
	h-svh and everything inside scrolls itself, so the only scrollbar it could
	ever show is one for content that has escaped its box.
-->
<div data-app-shell class="flex h-svh overflow-hidden">
	<!-- First in the DOM so it is the first thing Tab reaches. -->
	<SkipLink />
	<AppSidebar {collapsed} />
	<div class="flex min-h-0 min-w-0 flex-1 flex-col">
		<Header {user} {collapsed} {initialTextScale} onToggleSidebar={toggle} />
		<!--
			tabindex="-1" so the skip link can actually land focus here; without it
			the browser scrolls to #main but focus stays on the link, and the next
			Tab goes back into the sidebar.

			min-h-0 is what makes overflow-y-auto work at all. A flex item defaults
			to `min-height: auto`, which floors it at its content height — so a long
			page grows this column past h-svh instead of scrolling inside it, and the
			page runs on past the last card into dead space.
		-->
		<main id="main" tabindex="-1" class="min-h-0 flex-1 overflow-y-auto outline-none">
			{@render children()}
		</main>
	</div>
</div>
