<script lang="ts">
  import { Dialog } from "bits-ui";
  import { XIcon } from "phosphor-svelte";
  import type { Snippet } from "svelte";
  let {
    open = $bindable(false),
    title,
    description,
    trigger,
    children,
  }: {
    open?: boolean;
    title: string;
    description: string;
    trigger?: Snippet;
    children: Snippet;
  } = $props();
</script>

<Dialog.Root bind:open>
  {#if trigger}<Dialog.Trigger>{@render trigger()}</Dialog.Trigger>{/if}
  <Dialog.Portal>
    <Dialog.Overlay class="fixed inset-0 z-50 bg-ink/35 backdrop-blur-[2px]" />
    <Dialog.Content
      class="form-dialog surface fixed inset-x-3 top-1/2 z-50 max-h-[calc(100dvh-2rem)] -translate-y-1/2 overflow-y-auto overscroll-contain rounded-xl p-6 shadow-2xl sm:left-1/2 sm:right-auto sm:w-[min(42rem,calc(100vw-2rem))] sm:-translate-x-1/2 sm:p-9"
    >
      <div class="mb-7 border-b border-line pb-6 pe-10">
        <p
          class="mb-3 text-[0.65rem] font-bold uppercase tracking-[0.18em] text-forest"
        >
          Buku operasional / Paviliun
        </p>
        <Dialog.Title class="font-display text-3xl font-medium">
          {title}
        </Dialog.Title>
        <Dialog.Description class="pretty mt-1 text-sm leading-6 text-muted">
          {description}
        </Dialog.Description>
      </div>
      <Dialog.Close
        class="absolute end-3 top-3 flex size-11 items-center justify-center rounded-md text-muted hover:bg-canvas hover:text-ink"
        aria-label="Tutup dialog"
      >
        <XIcon size={20} aria-hidden="true" />
      </Dialog.Close>
      {@render children()}
    </Dialog.Content>
  </Dialog.Portal>
</Dialog.Root>
