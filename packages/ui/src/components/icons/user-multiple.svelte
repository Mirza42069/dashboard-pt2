<script lang="ts">
	import { UserMultipleIcon } from "@hugeicons/core-free-icons";
	import Icon, { type IconProps } from "./icon.svelte";

	let props: IconProps = $props();
</script>

<Icon icon={UserMultipleIcon} {...props} />
