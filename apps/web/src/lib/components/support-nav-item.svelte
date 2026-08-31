<script lang="ts" module>
	/** Matches the support inbox; nothing here needs to be fresher than that. */
	const POLL_INTERVAL_MS = 30_000;
</script>

<script lang="ts">
	import type { Role } from "@DashboardPT2/api/lib/permissions";
	import { Headset, LifeBuoy } from "@DashboardPT2/ui/components/icons";
	import * as Tooltip from "@DashboardPT2/ui/components/tooltip";
	import { cn } from "@DashboardPT2/ui/lib/utils";
	import { createQuery } from "@tanstack/svelte-query";
	import { page } from "$app/state";

	import { interpolate } from "../../i18n";
	import { getT } from "../../i18n/context.svelte";
	import { orpc } from "../orpc";

	let {
		role,
		collapsed = false,
		onNavigate
	}: { role: Role; collapsed?: boolean; onNavigate?: () => void } = $props();

	const t = getT();
	const isSystem = $derived(role === "super_admin");

	// Two different features share this slot: the global inbox for System
	// accounts, the requester's own conversations for everyone else.
	const supportHref = $derived(isSystem ? "/admin/support" : "/support");
	const isActive = $derived(
		page.url.pathname === supportHref || page.url.pathname.startsWith(`${supportHref}/`)
	);
	// Not "Contact support" any more: for a requester this leads to their
	// conversations, of which starting a new one is only part.
	const label = $derived(isSystem ? t.support.inboxTitle : t.nav.support);

	// System accounts cannot file a request, so they are never the requester the
	// badge counts for — the query would always answer zero.
	const unreadQuery = createQuery(() => ({
		...orpc.support.unreadCount.queryOptions(),
		enabled: !isSystem,
		refetchInterval: POLL_INTERVAL_MS,
		refetchIntervalInBackground: false
	}));
	const unread = $derived(isSystem ? 0 : (unreadQuery.data?.unread ?? 0));

	const withCount = $derived(
		`${label} — ${interpolate(t.support.unreadCount, { count: String(unread) })}`
	);
</script>

<Tooltip.Root disabled={!collapsed}>
	<Tooltip.Trigger>
		{#snippet child({ props })}
			<a
				{...props}
				href={supportHref}
				onclick={onNavigate}
				aria-current={isActive ? "page" : undefined}
				aria-label={collapsed || unread > 0 ? (unread > 0 ? withCount : label) : undefined}
				class={cn(
					"relative flex h-10 w-full items-center gap-2 overflow-hidden rounded-md px-2 text-sm transition-[background-color,color] duration-[400ms]",
					isActive
						? "bg-muted font-medium text-foreground"
						: "text-muted-foreground hover:bg-muted/60 hover:text-foreground"
				)}
			>
				<span
					aria-hidden="true"
					class={cn(
						"absolute left-0 w-0.5 rounded-r-full bg-foreground transition-[height,opacity] duration-[400ms]",
						isActive ? "h-5 opacity-100" : "h-0 opacity-0"
					)}
				></span>
				{#if isSystem}
					<Headset class="size-4 shrink-0" />
				{:else}
					<LifeBuoy class="size-4 shrink-0" />
				{/if}
				<span class="shrink-0 whitespace-nowrap">{label}</span>
				{#if unread > 0}
					<!--
						Expanded: a counted pill after the label. Not shrink-0 against the
						rail's clipping edge — it should slide out of view with the text
						rather than pin itself to the icon.
					-->
					<span
						aria-hidden="true"
						class="ml-auto shrink-0 rounded-full bg-primary px-1.5 py-0.5 text-[0.6875rem] leading-none font-medium text-primary-foreground tabular-nums"
					>
						{unread}
					</span>
					{#if collapsed}
						<!--
							Collapsed: the pill is clipped away with everything else, so a dot
							rides the icon instead. Purely decorative — the count is in the
							link's accessible name above.
						-->
						<span
							aria-hidden="true"
							class="absolute top-2 left-6 size-2 rounded-full bg-primary ring-2 ring-background"
						></span>
					{/if}
				{/if}
			</a>
		{/snippet}
	</Tooltip.Trigger>
	<Tooltip.Content side="right">{unread > 0 ? withCount : label}</Tooltip.Content>
</Tooltip.Root>
