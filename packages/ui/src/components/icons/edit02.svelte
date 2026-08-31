<script lang="ts">
	import { Edit02Icon } from "@hugeicons/core-free-icons";
	import Icon, { type IconProps } from "./icon.svelte";

	let props: IconProps = $props();
</script>

<Icon icon={Edit02Icon} {...props} />
