<script lang="ts">
	import { ChartUpIcon } from "@hugeicons/core-free-icons";
	import Icon, { type IconProps } from "./icon.svelte";

	let props: IconProps = $props();
</script>

<Icon icon={ChartUpIcon} {...props} />
