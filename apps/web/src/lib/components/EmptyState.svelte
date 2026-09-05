<script lang="ts">
  import type { Component, Snippet } from "svelte";
  let {
    icon,
    title,
    description,
    action,
  }: { icon: Component; title: string; description: string; action?: Snippet } =
    $props();
  const Icon = $derived(icon);
</script>

<div
  class="surface flex min-h-80 flex-col items-center justify-center rounded-lg px-6 py-16 text-center"
>
  <span
    class="mb-6 grid size-16 place-items-center rounded-full border border-line bg-canvas"
  >
    <Icon size={28} aria-hidden="true" class="text-forest" />
  </span>
  <h2 class="font-display text-3xl font-medium">{title}</h2>
  <p class="pretty mt-2 max-w-md text-sm leading-6 text-muted">{description}</p>
  {#if action}<div class="mt-5">{@render action()}</div>{/if}
</div>
