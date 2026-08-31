<script lang="ts">
	import { ArchiveRestoreIcon } from "@hugeicons/core-free-icons";
	import Icon, { type IconProps } from "./icon.svelte";

	let props: IconProps = $props();
</script>

<Icon icon={ArchiveRestoreIcon} {...props} />
