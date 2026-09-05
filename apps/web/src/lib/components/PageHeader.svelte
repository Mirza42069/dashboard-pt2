<script lang="ts">
  import type { Snippet } from "svelte";
  let {
    eyebrow = "",
    title,
    description,
    actions,
  }: {
    eyebrow?: string;
    title: string;
    description?: string;
    actions?: Snippet;
  } = $props();
</script>

<header
  class="page-heading mb-9 flex flex-col justify-between gap-6 border-b border-line pb-8 xl:flex-row xl:items-end"
>
  <div class="max-w-2xl">
    {#if eyebrow}<p
        class="mb-3 text-[0.68rem] font-bold uppercase tracking-[0.18em] text-forest"
      >
        {eyebrow}
      </p>{/if}
    <h1
      class="font-display balance text-4xl font-medium leading-[1.08] tracking-[-0.025em] text-ink sm:text-5xl"
    >
      {title}
    </h1>
    {#if description}<p
        class="pretty mt-3 max-w-xl text-sm leading-6 text-muted"
      >
        {description}
      </p>{/if}
  </div>
  {#if actions}<div class="flex shrink-0 flex-wrap gap-3">
      {@render actions()}
    </div>{/if}
</header>
