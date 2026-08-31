<script lang="ts">
	import AppShell from '$lib/components/app-shell.svelte';

	let { data, children } = $props();
</script>

<AppShell
	user={data.shellUser}
	initialCollapsed={data.preferences.sidebarCollapsed}
	initialTextScale={data.preferences.textScale}
>
	{@render children()}
</AppShell>
