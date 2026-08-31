<script lang="ts" module>
	import { HugeiconsIcon } from "@hugeicons/svelte";
	import type { ComponentProps } from "svelte";

	/** HugeiconsIcon's props minus the glyph each wrapper is bound to. */
	export type IconProps = Omit<ComponentProps<typeof HugeiconsIcon>, "icon">;
</script>

<script lang="ts">
	import type { IconSvgElement } from "@hugeicons/svelte";

	let { icon, ...rest }: IconProps & { icon: IconSvgElement } = $props();
</script>

<!--
	aria-hidden by default, and it has to be set here rather than left to call
	sites. lucide did this automatically — its Icon applied aria-hidden="true"
	whenever the icon had no children and no a11y prop of its own — and
	HugeiconsIcon does not, so dropping it would expose every one of these to
	screen readers. Icon-only buttons already carry their own aria-label, so the
	icon inside would be announced a second time with no name to give.

	Before the spread on purpose: an icon that ever needs to carry its own name
	can pass aria-hidden={false} with an aria-label and win.

	Glyph *size* is deliberately not set here. A size-* class on the icon would
	satisfy the :not([class*='size-']) guard in every component's sizing rule and
	so override all of them at once — a 16px glyph inside a 24px icon-xs button.
	The defaults live in those components instead.

	strokeWidth is left alone for the same reason: Hugeicons' own 1.5 is the
	weight the set is drawn at. A call site that wants heavier can pass its own.
-->
<HugeiconsIcon {icon} aria-hidden {...rest} />
