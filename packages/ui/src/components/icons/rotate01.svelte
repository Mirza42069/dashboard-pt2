<script lang="ts">
	import { Rotate01Icon } from "@hugeicons/core-free-icons";
	import Icon, { type IconProps } from "./icon.svelte";

	let props: IconProps = $props();
</script>

<Icon icon={Rotate01Icon} {...props} />
