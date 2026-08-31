<script lang="ts">
	import { CircleSlashTwoIcon } from "@hugeicons/core-free-icons";
	import Icon, { type IconProps } from "./icon.svelte";

	let props: IconProps = $props();
</script>

<Icon icon={CircleSlashTwoIcon} {...props} />
