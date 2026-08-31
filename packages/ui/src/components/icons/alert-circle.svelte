<script lang="ts">
	import { AlertCircleIcon } from "@hugeicons/core-free-icons";
	import Icon, { type IconProps } from "./icon.svelte";

	let props: IconProps = $props();
</script>

<Icon icon={AlertCircleIcon} {...props} />
