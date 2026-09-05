<script lang="ts">
  import { page } from "$app/state";
  import { goto } from "$app/navigation";
  import { authClient } from "$lib/auth-client";
  import { getOrganization } from "$lib/organization.svelte";
  import { Dialog, DropdownMenu } from "bits-ui";
  import {
    BankIcon,
    BuildingsIcon,
    ChartLineUpIcon,
    FileTextIcon,
    GearIcon,
    HouseIcon,
    ListIcon,
    ReceiptIcon,
    SignOutIcon,
    UsersThreeIcon,
    WalletIcon,
    WrenchIcon,
    XIcon,
    CaretDownIcon,
    ArrowUpRightIcon,
  } from "phosphor-svelte";
  import type { Snippet } from "svelte";

  let { children }: { children: Snippet } = $props();
  let drawerOpen = $state(false);
  let signingOut = $state(false);
  let accountError = $state("");
  const session = authClient.useSession();
  const organization = getOrganization();
  const groups = [
    {
      label: "Ruang kelola",
      items: [
        { href: "/dashboard", label: "Ikhtisar", icon: HouseIcon },
        { href: "/properti", label: "Properti & kamar", icon: BuildingsIcon },
        { href: "/penghuni", label: "Penghuni", icon: UsersThreeIcon },
        { href: "/kontrak", label: "Kontrak sewa", icon: FileTextIcon },
      ],
    },
    {
      label: "Keuangan",
      items: [
        { href: "/tagihan", label: "Tagihan", icon: ReceiptIcon },
        { href: "/pembayaran", label: "Pembayaran", icon: BankIcon },
        { href: "/pengeluaran", label: "Pengeluaran", icon: WalletIcon },
        { href: "/laporan", label: "Laporan", icon: ChartLineUpIcon },
      ],
    },
    {
      label: "Operasional",
      items: [
        { href: "/pemeliharaan", label: "Pemeliharaan", icon: WrenchIcon },
        { href: "/pengaturan", label: "Pengaturan", icon: GearIcon },
      ],
    },
  ];
  const active = $derived(
    groups
      .flatMap((group) => group.items)
      .find((item) => page.url.pathname.startsWith(item.href)),
  );

  async function signOut() {
    if (signingOut) return;
    signingOut = true;
    organization.signingOut = true;
    accountError = "";
    try {
      const result = await authClient.signOut();
      if (result.error) throw new Error();
      organization.organization = null;
      organization.membership = null;
      await goto("/masuk");
    } catch {
      organization.signingOut = false;
      accountError = "Belum dapat keluar. Periksa koneksi lalu coba lagi.";
    } finally {
      signingOut = false;
    }
  }
</script>

{#snippet navigation()}
  <div class="flex min-h-full flex-col px-5 py-8">
    <a
      href="/dashboard"
      class="mb-10 flex items-center gap-3 px-3"
      onclick={() => (drawerOpen = false)}
    >
      <span class="brand-mark" aria-hidden="true">
        <span></span>
        <span></span>
        <span></span>
      </span>
      <span>
        <strong
          class="font-display block text-[1.8rem] font-medium leading-none tracking-tight"
        >
          Paviliun
        </strong>
        <small class="mt-2 block text-[0.65rem] tracking-[0.08em] text-muted">
          RUANG KELOLA KOS
        </small>
      </span>
    </a>
    <nav class="flex-1 space-y-6" aria-label="Navigasi utama">
      {#each groups as group (group.label)}
        <div>
          <p
            class="mb-2 px-3 text-[0.62rem] font-semibold uppercase tracking-[0.15em] text-muted"
          >
            {group.label}
          </p>
          <ul class="space-y-1">
            {#each group.items as item (item.href)}
              <li>
                <a
                  href={item.href}
                  aria-current={active?.href === item.href ? "page" : undefined}
                  onclick={() => (drawerOpen = false)}
                  class={`flex min-h-11 items-center gap-3 rounded-md px-3 text-[0.83rem] transition-colors ${active?.href === item.href ? "bg-forest-soft font-semibold text-forest" : "text-muted hover:bg-canvas hover:text-ink"}`}
                >
                  <item.icon
                    size={19}
                    weight="regular"
                    aria-hidden="true"
                  />{item.label}
                  {#if active?.href === item.href}<span
                      class="ms-auto size-1.5 rounded-full bg-forest"
                      aria-hidden="true"
                    ></span>{/if}
                </a>
              </li>
            {/each}
          </ul>
        </div>
      {/each}
    </nav>
    <div class="mt-8 border-t border-line px-3 pt-5">
      <p class="text-[0.65rem] uppercase tracking-widest text-muted">
        Ruang kerja
      </p>
      <p class="mt-2 break-words text-sm font-semibold">
        {organization.organization?.name ?? "Organisasi kos"}
      </p>
      <p class="mt-1 text-xs text-muted">
        {organization.membership?.role === "owner"
          ? "Dikelola oleh Anda"
          : "Akses tim pengelola"}
      </p>
    </div>
  </div>
{/snippet}

<a
  class="fixed start-3 top-3 z-[100] -translate-y-20 rounded-md bg-forest px-4 py-3 text-sm font-semibold text-white focus:translate-y-0"
  href="#konten-utama"
>
  Lewati ke konten utama
</a>
<div class="min-h-dvh lg:grid lg:grid-cols-[16rem_minmax(0,1fr)]">
  <aside
    class="no-print fixed inset-y-0 start-0 z-30 hidden w-64 overflow-y-auto border-e border-line bg-paper lg:block"
  >
    {@render navigation()}
  </aside>
  <div class="min-w-0 lg:col-start-2">
    <header
      class="no-print flex min-h-20 items-center gap-4 border-b border-line px-4 sm:px-8 lg:px-12"
    >
      <Dialog.Root bind:open={drawerOpen}>
        <Dialog.Trigger
          class="grid size-11 shrink-0 place-items-center rounded-md hover:bg-forest-soft lg:hidden"
          aria-label="Buka navigasi"
        >
          <ListIcon size={23} aria-hidden="true" />
        </Dialog.Trigger>
        <Dialog.Portal>
          <Dialog.Overlay class="fixed inset-0 z-40 bg-ink/35" />
          <Dialog.Content
            class="fixed inset-y-0 start-0 z-50 w-[min(20rem,90vw)] overflow-y-auto overscroll-contain bg-paper"
          >
            <Dialog.Title class="sr-only">Navigasi Paviliun</Dialog.Title>
            <Dialog.Description class="sr-only">
              Pilih halaman pengelolaan kos.
            </Dialog.Description>
            <Dialog.Close
              class="absolute end-1 top-1 grid size-11 place-items-center rounded-md hover:bg-canvas"
              aria-label="Tutup navigasi"
            >
              <XIcon size={20} aria-hidden="true" />
            </Dialog.Close>
            {@render navigation()}
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
      <p class="min-w-0 text-xs text-muted">
        <span class="hidden sm:inline">
          Ruang pengelola <span class="mx-3 text-line">/</span>
        </span>
        <span class="font-medium text-ink">{active?.label ?? "Paviliun"}</span>
      </p>
      <DropdownMenu.Root>
        <DropdownMenu.Trigger
          class="ms-auto flex min-h-11 min-w-0 items-center gap-3 rounded-md px-2 text-sm hover:bg-forest-soft"
          aria-label="Buka menu akun"
          disabled={signingOut}
        >
          <span
            class="grid size-9 shrink-0 place-items-center rounded-full border border-forest/20 bg-forest-soft text-xs font-semibold text-forest"
          >
            {$session.data?.user?.name?.slice(0, 2).toUpperCase() ?? "AK"}
          </span>
          <span class="hidden max-w-40 truncate sm:block">
            {$session.data?.user?.name ?? "Akun"}
          </span>
          <CaretDownIcon size={13} aria-hidden="true" />
        </DropdownMenu.Trigger>
        <DropdownMenu.Portal>
          <DropdownMenu.Content
            sideOffset={8}
            align="end"
            class="z-50 w-64 rounded-lg border border-line bg-paper p-2 shadow-xl"
          >
            <div class="break-words px-3 py-3">
              <p class="text-sm font-semibold">{$session.data?.user?.name}</p>
              <p class="mt-1 text-xs text-muted">
                {$session.data?.user?.email}
              </p>
            </div>
            <DropdownMenu.Separator class="my-1 h-px bg-line" />
            <DropdownMenu.Item
              class="rounded-md outline-none data-[highlighted]:bg-forest-soft"
            >
              {#snippet child({ props })}<a
                  {...props}
                  href="/pengaturan"
                  class="flex min-h-11 items-center justify-between rounded-md px-3 text-sm"
                >
                  Pengaturan ruang kerja<ArrowUpRightIcon
                    size={16}
                    aria-hidden="true"
                  />
                </a>{/snippet}
            </DropdownMenu.Item>
            <DropdownMenu.Item
              onclick={signOut}
              class="flex min-h-11 items-center gap-2 rounded-md px-3 text-sm text-danger outline-none data-[highlighted]:bg-clay-soft"
            >
              <SignOutIcon size={17} aria-hidden="true" />Keluar dari akun
            </DropdownMenu.Item>
          </DropdownMenu.Content>
        </DropdownMenu.Portal>
      </DropdownMenu.Root>
    </header>
    <main
      id="konten-utama"
      class="mx-auto w-full max-w-[90rem] px-4 py-8 sm:px-8 lg:px-12 lg:py-12"
      tabindex="-1"
    >
      {#if accountError}<p
          class="mb-6 rounded-md bg-clay-soft p-4 text-sm text-danger"
          role="alert"
        >
          {accountError}
        </p>{/if}
      {@render children()}
    </main>
    <footer
      class="no-print mx-4 flex flex-wrap justify-between gap-2 border-t border-line py-6 text-[0.65rem] text-muted sm:mx-8 lg:mx-12"
    >
      <span>Paviliun / Operasional kos, tertata.</span>
      <span>Catatan yang baik, pengelolaan yang tenang.</span>
    </footer>
  </div>
</div>

<style>
  .brand-mark {
    display: flex;
    align-items: end;
    gap: 3px;
    width: 35px;
    height: 36px;
  }
  .brand-mark span {
    width: 9px;
    height: 27px;
    border: 1.5px solid var(--color-forest);
    border-radius: 8px 8px 0 0;
  }
  .brand-mark span:nth-child(2) {
    height: 36px;
    background: var(--color-forest);
  }
</style>
