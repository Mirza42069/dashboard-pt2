<script lang="ts">
	import { JusticeScale01Icon } from "@hugeicons/core-free-icons";
	import Icon, { type IconProps } from "./icon.svelte";

	let props: IconProps = $props();
</script>

<Icon icon={JusticeScale01Icon} {...props} />
