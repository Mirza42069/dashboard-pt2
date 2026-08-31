<script lang="ts">
	import { getT } from '../../../i18n/context.svelte';
	import { BRAND_NAME } from '$lib/components/brand';
	import DashboardOverview from './dashboard-overview.svelte';

	let { data } = $props();
	const t = getT();
</script>

<svelte:head>
	<title>{t.financeDashboard.title} - {BRAND_NAME}</title>
</svelte:head>

<DashboardOverview initialSummary={data.summary} initialReconciliations={data.reconciliations} />
