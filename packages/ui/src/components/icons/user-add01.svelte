<script lang="ts">
	import { UserAdd01Icon } from "@hugeicons/core-free-icons";
	import Icon, { type IconProps } from "./icon.svelte";

	let props: IconProps = $props();
</script>

<Icon icon={UserAdd01Icon} {...props} />
