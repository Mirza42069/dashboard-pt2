<script lang="ts" module>
	import { LayoutDashboard, ListChecks, type IconComponent } from "@DashboardPT2/ui/components/icons";

	import type { Dictionary } from "../../i18n";

	type NavItem = {
		href: string;
		labelKey: keyof Dictionary["nav"];
		icon: IconComponent;
	};

	type NavSection = {
		headingKey?: keyof Dictionary["nav"];
		items: NavItem[];
	};

	/**
	 * Settings deliberately lives in the account menu, not here: it configures
	 * the person, not the business.
	 */
	const SECTIONS: NavSection[] = [
		{
			items: [
				{ href: "/dashboard", labelKey: "dashboard", icon: LayoutDashboard },
				{ href: "/reconciliations", labelKey: "reconciliations", icon: ListChecks }
			]
		}
	];

	/**
	 * Circ-out over a full second. Almost all the distance goes in the first
	 * ~350ms and the rest is a long settle, so the rail reads as gliding to a
	 * stop rather than easing off. Written as a literal class string, not
	 * composed at runtime, so Tailwind's scanner still sees `duration-[1000ms]`
	 * and the `ease-[...]` value in the source. No spaces inside cubic-bezier()
	 * — Tailwind will not parse an arbitrary value that contains them.
	 *
	 * This times the rail and the things that must move *with* it. It
	 * deliberately does not touch hover colour; see the row below.
	 *
	 * No motion-reduce guard here, deliberately — see the reduced-motion block in
	 * packages/ui/src/styles/globals.css. On Windows that query follows Settings
	 * > Accessibility > Visual effects > Animation effects, which is off on
	 * machines with no motion sensitivity involved, and it would take the whole
	 * collapse with it.
	 */
	const MOTION = "duration-[1000ms] ease-[cubic-bezier(0.075,0.82,0.165,1)]";
</script>

<script lang="ts">
	import * as Tooltip from "@DashboardPT2/ui/components/tooltip";
	import { cn } from "@DashboardPT2/ui/lib/utils";
	import { page } from "$app/state";

	import { getT } from "../../i18n/context.svelte";

	let {
		collapsed = false,
		onNavigate
	}: { collapsed?: boolean; onNavigate?: () => void } = $props();

	const t = getT();

	const sections = SECTIONS;

	function isActive(href: string) {
		return page.url.pathname === href || page.url.pathname.startsWith(`${href}/`);
	}
</script>

<nav class={cn("flex flex-col transition-[gap]", MOTION, collapsed ? "gap-1" : "gap-5")}>
	{#each sections as section, sectionIndex (section.headingKey ?? "main")}
		<div class="space-y-1">
			<!--
				Collapsed: a hairline separates groups, since headings won't fit.
				Keyed off sectionIndex rather than a first:hidden rule, which would
				never render a separator at all — the hairline is the first child of
				every section wrapper, so :first-child always matches.
			-->
			{#if collapsed && sectionIndex > 0}
				<div class="mx-2 my-1 border-t"></div>
			{/if}

			<!--
				The one thing in the rail that fades rather than clips. Headings are
				the exception because a partial word ("OPERA") would sit there for
				most of a one-second slide, which nothing else here risks.

				Two durations against the two properties, in order: the height closes
				with the rail so the rows below it travel in sync, while the text
				itself is gone in 100ms. Collapsing both onto one duration is what
				makes this look wrong — a fast height snaps every row upward while
				the rail is still a tenth of the way through.

				It collapses to zero height rather than unmounting, so it slides away
				with the rail instead of vanishing on the first frame.
			-->
			{#if section.headingKey}
				<p
					aria-hidden={collapsed}
					class={cn(
						"overflow-hidden px-2 text-[0.6875rem] font-medium tracking-widest whitespace-nowrap text-muted-foreground uppercase",
						"transition-[height,opacity] duration-[1000ms,100ms] ease-[cubic-bezier(0.075,0.82,0.165,1)]",
						collapsed ? "h-0 opacity-0" : "h-4 opacity-100"
					)}
				>
					{t.nav[section.headingKey]}
				</p>
			{/if}

			{#each section.items as item (item.href)}
				{@const active = isActive(item.href)}
				{@const label = t.nav[item.labelKey]}
				{@const Icon = item.icon}
				<!--
					Wrapped in a Tooltip in both states and disabled when expanded,
					rather than swapping between a Tooltip and a plain link. Swapping
					changes the element at this position, so the link is torn down and
					rebuilt on every toggle — and a freshly mounted node has no previous
					value to transition from. Everything below would land on its target
					classes on the first frame while the rail slid, which is the jump
					the rest of this file exists to avoid.

					aria-label names the link explicitly when collapsed: the label span
					stays in the DOM, clipped by the row's overflow edge, and not every
					screen reader announces a clipped text node reliably.
				-->
				<Tooltip.Root disabled={!collapsed}>
					<Tooltip.Trigger>
						{#snippet child({ props })}
							<a
								{...props}
								href={item.href}
								onclick={onNavigate}
								aria-current={active ? "page" : undefined}
								aria-label={collapsed ? label : undefined}
								class={cn(
									// Geometrically identical in both states — no width, gap or
									// padding swap. That is the whole trick behind the
									// animation: nothing inside the rail moves, and the rail's
									// own edge travels over the content and clips it. The moment
									// the row changes shape, icons drift and the illusion goes.
									//
									// Combined with the container's px-3 (see app-sidebar),
									// px-2 here puts the icon 20px from the rail edge, which is
									// where the collapsed layout lands it too.
									"relative flex h-10 w-full items-center gap-2 overflow-hidden rounded-md px-2 text-sm",
									// Colour only, and pointedly not on MOTION. Hover has
									// nothing to do with the collapse, and at 1000ms a row would
									// take a full second to light up under the cursor.
									"transition-[background-color,color] duration-[400ms]",
									active
										? "bg-muted font-medium text-foreground"
										: "text-muted-foreground hover:bg-muted/60 hover:text-foreground"
								)}
							>
								<!--
									Active marker grows from the row's centre line rather than
									fading, so moving between pages reads as the bar travelling.
									On the row's own 400ms and not MOTION: this fires on
									navigation, not on collapse, and a marker that took a full
									second to arrive would still be growing well after the new
									page had rendered.
								-->
								<span
									aria-hidden="true"
									class={cn(
										"absolute left-0 w-0.5 rounded-r-full bg-foreground transition-[height,opacity] duration-[400ms]",
										active ? "h-5 opacity-100" : "h-0 opacity-0"
									)}
								></span>
								<!--
									Never scales. It is the fixed point the slide is measured
									against — if it grows, the rail stops looking like it is
									passing over the row and starts looking like the row is
									reacting to it.
								-->
								<Icon class="size-4 shrink-0" />
								<!--
									No transition at all, which is the point. The label keeps its
									natural width the whole time and the row's overflow-hidden
									edge cuts it off as the rail narrows.

									shrink-0 is load-bearing: without it flex squeezes the span as
									the row narrows and the text reflows or wraps instead of being
									cleanly clipped.
								-->
								<span class="shrink-0 whitespace-nowrap">{label}</span>
							</a>
						{/snippet}
					</Tooltip.Trigger>
					<Tooltip.Content side="right">{label}</Tooltip.Content>
				</Tooltip.Root>
			{/each}
		</div>
	{/each}
</nav>
