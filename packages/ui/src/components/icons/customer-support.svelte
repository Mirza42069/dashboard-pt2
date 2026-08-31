<script lang="ts">
	import { CustomerSupportIcon } from "@hugeicons/core-free-icons";
	import Icon, { type IconProps } from "./icon.svelte";

	let props: IconProps = $props();
</script>

<Icon icon={CustomerSupportIcon} {...props} />
