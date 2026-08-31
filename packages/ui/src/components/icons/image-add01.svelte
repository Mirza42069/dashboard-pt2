<script lang="ts">
	import { ImageAdd01Icon } from "@hugeicons/core-free-icons";
	import Icon, { type IconProps } from "./icon.svelte";

	let props: IconProps = $props();
</script>

<Icon icon={ImageAdd01Icon} {...props} />
