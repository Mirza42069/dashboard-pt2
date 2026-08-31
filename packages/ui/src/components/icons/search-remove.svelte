<script lang="ts">
	import { SearchRemoveIcon } from "@hugeicons/core-free-icons";
	import Icon, { type IconProps } from "./icon.svelte";

	let props: IconProps = $props();
</script>

<Icon icon={SearchRemoveIcon} {...props} />
