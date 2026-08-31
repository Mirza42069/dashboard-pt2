<script lang="ts">
	import { Button } from '@DashboardPT2/ui/components/button';
	import { ChevronLeft } from '@DashboardPT2/ui/components/icons';
	import * as Tooltip from '@DashboardPT2/ui/components/tooltip';
	import { cn } from '@DashboardPT2/ui/lib/utils';

	import { getT } from '../../i18n/context.svelte';
	import type { TextScale } from '../text-scale';
	import type { ShellUser } from './app-shell.svelte';
	import MobileNav from './mobile-nav.svelte';
	import UserMenu from './user-menu.svelte';

	let {
		user,
		collapsed,
		initialTextScale,
		onToggleSidebar
	}: {
		user: ShellUser;
		collapsed: boolean;
		initialTextScale: TextScale;
		onToggleSidebar: () => void;
	} = $props();

	const t = getT();
	const label = $derived(collapsed ? t.nav.expandSidebar : t.nav.collapseSidebar);
</script>

<header
	class="flex h-12 shrink-0 items-center justify-between gap-2 border-b bg-card px-3 md:px-4"
>
	<div class="flex items-center gap-1">
		<MobileNav />
		<!-- Desktop only — on mobile the Sheet is the navigation. -->
		<Tooltip.Root>
			<Tooltip.Trigger>
				{#snippet child({ props })}
					<Button
						{...props}
						variant="ghost"
						size="icon-sm"
						class="hidden md:inline-flex"
						aria-label={label}
						onclick={onToggleSidebar}
					>
						<!--
							One icon that rotates, not two that swap. Swapping is instant and
							leaves the button out of the gesture entirely; rotating makes it
							part of the same movement as the rail.

							600ms and the browser's default `ease`, spelled out because
							Tailwind's default transition timing is a different curve.
							Finishing before the 1000ms rail does is intended: the control
							settles, then the rail catches up to it.
						-->
						<ChevronLeft
							class={cn(
								'transition-transform duration-[600ms] ease-[cubic-bezier(0.25,0.1,0.25,1)]',
								collapsed && 'rotate-180'
							)}
						/>
					</Button>
				{/snippet}
			</Tooltip.Trigger>
			<Tooltip.Content side="bottom">{label}</Tooltip.Content>
		</Tooltip.Root>
	</div>
	<!-- Global controls stay together at the trailing edge of the top bar. -->
	<div class="flex items-center gap-2">
		<UserMenu {user} {initialTextScale} />
	</div>
</header>
