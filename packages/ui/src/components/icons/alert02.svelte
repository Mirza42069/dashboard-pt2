<script lang="ts">
	import { Alert02Icon } from "@hugeicons/core-free-icons";
	import Icon, { type IconProps } from "./icon.svelte";

	let props: IconProps = $props();
</script>

<Icon icon={Alert02Icon} {...props} />
