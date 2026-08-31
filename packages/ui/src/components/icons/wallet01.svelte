<script lang="ts">
	import { Wallet01Icon } from "@hugeicons/core-free-icons";
	import Icon, { type IconProps } from "./icon.svelte";

	let props: IconProps = $props();
</script>

<Icon icon={Wallet01Icon} {...props} />
