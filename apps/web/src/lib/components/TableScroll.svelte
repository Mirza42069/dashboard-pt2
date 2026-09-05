<script lang="ts">
  import type { Snippet } from "svelte";
  let {
    label,
    children,
    class: className = "",
  }: { label: string; children: Snippet; class?: string } = $props();
</script>

<!-- Keyboard users need a focusable scroll region to reach off-screen columns. -->
<!-- svelte-ignore a11y_no_noninteractive_tabindex -->
<div
  class={`overflow-x-auto overscroll-x-contain ${className}`}
  role="region"
  aria-label={label}
  tabindex="0"
>
  {@render children()}
</div>
