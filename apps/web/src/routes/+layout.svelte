<script lang="ts">
	import { Toaster } from '@DashboardPT2/ui/components/sonner';
	import { TooltipProvider } from '@DashboardPT2/ui/components/tooltip';
	import { QueryClientProvider } from '@tanstack/svelte-query';

	import '../app.css';
	import { setI18n } from '../i18n/context.svelte';
	import { getQueryClient } from '$lib/orpc';

	let { data, children } = $props();

	// Per component instance: once per tab in the browser, once per request on the
	// server. See getQueryClient() for why the server must not share one.
	const queryClient = getQueryClient();

	// setContext has to run during component initialisation, before children
	// render. Passed as a getter so the dictionary follows a locale change.
	setI18n(() => data.preferences.locale);
</script>

<!--
	No theme provider: the theme class is already on <html> from the server.
	See lib/theme.ts for why a theme library was dropped.

	Chrome lives in routes/(app)/+layout.svelte — /login and /change-password
	render bare so they cannot show navigation to pages you can't open.
-->
<TooltipProvider>
	<QueryClientProvider client={queryClient}>
		{@render children()}
	</QueryClientProvider>
	<Toaster richColors theme={data.preferences.theme} />
</TooltipProvider>
