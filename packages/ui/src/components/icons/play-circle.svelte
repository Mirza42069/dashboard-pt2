<script lang="ts">
	import { PlayCircleIcon } from "@hugeicons/core-free-icons";
	import Icon, { type IconProps } from "./icon.svelte";

	let props: IconProps = $props();
</script>

<Icon icon={PlayCircleIcon} {...props} />
