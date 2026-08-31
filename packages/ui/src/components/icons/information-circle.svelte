<script lang="ts">
	import { InformationCircleIcon } from "@hugeicons/core-free-icons";
	import Icon, { type IconProps } from "./icon.svelte";

	let props: IconProps = $props();
</script>

<Icon icon={InformationCircleIcon} {...props} />
