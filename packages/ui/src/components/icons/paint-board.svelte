<script lang="ts">
	import { PaintBoardIcon } from "@hugeicons/core-free-icons";
	import Icon, { type IconProps } from "./icon.svelte";

	let props: IconProps = $props();
</script>

<Icon icon={PaintBoardIcon} {...props} />
