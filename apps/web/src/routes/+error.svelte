<script lang="ts">
  import { page } from "$app/state";
  import Button from "$lib/components/Button.svelte";
  import { WarningIcon } from "phosphor-svelte";
</script>

<svelte:head><title>Halaman bermasalah | Paviliun</title></svelte:head>
<main class="grid min-h-dvh place-items-center px-4 py-16">
  <div class="surface max-w-lg rounded-xl p-8 text-center">
    <WarningIcon size={34} class="mx-auto text-clay" aria-hidden="true" />
    <p class="mt-5 text-xs font-bold uppercase tracking-[0.14em] text-clay">
      Kesalahan {page.status}
    </p>
    <h1 class="font-display balance mt-2 text-3xl font-semibold">
      Halaman belum dapat dibuka
    </h1>
    <p class="pretty mt-3 text-sm leading-6 text-muted">
      {page.status === 404
        ? "Alamat yang Anda buka tidak ditemukan. Periksa tautan atau kembali ke ikhtisar."
        : "Terjadi kendala saat menampilkan halaman. Coba muat ulang atau kembali ke ikhtisar."}
    </p>
    <div class="mt-6 flex flex-wrap justify-center gap-2">
      <Button href="/dashboard">Kembali ke ikhtisar</Button><Button
        variant="secondary"
        onclick={() => location.reload()}
      >
        Muat ulang
      </Button>
    </div>
  </div>
</main>
