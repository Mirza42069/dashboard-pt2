<script lang="ts">
  import { api } from "@my-better-t-app/backend/convex/_generated/api";
  import { useMutation, useQuery } from "convex-svelte";
  import { Tabs, Tooltip } from "bits-ui";
  import { getOrganization } from "$lib/organization.svelte";
  import { formatCurrency, formatDate, getErrorMessage } from "$lib/format";
  import Button from "$lib/components/Button.svelte";
  import EmptyState from "$lib/components/EmptyState.svelte";
  import PageHeader from "$lib/components/PageHeader.svelte";
  import QueryError from "$lib/components/QueryError.svelte";
  import Skeleton from "$lib/components/Skeleton.svelte";
  import StatusBadge from "$lib/components/StatusBadge.svelte";
  import TableScroll from "$lib/components/TableScroll.svelte";
  import {
    ArrowUpRightIcon,
    BuildingsIcon,
    InfoIcon,
    PlusIcon,
    ReceiptIcon,
    WrenchIcon,
  } from "phosphor-svelte";

  const org = getOrganization();
  const dashboard = useQuery(api.dashboard.get, () =>
    org.organization?._id ? { organizationId: org.organization._id } : "skip",
  );
  const invoices = useQuery(api.invoices.list, () =>
    org.organization?._id ? { organizationId: org.organization._id } : "skip",
  );
  const seedDemo = useMutation(api.seed.createDemo);
  let seeding = $state(false);
  let message = $state("");
  let error = $state("");
  let invoiceTab = $state("overdue");
  const occupancy = $derived(
    dashboard.data?.roomCount
      ? Math.round(
          (dashboard.data.occupiedRoomCount / dashboard.data.roomCount) * 100,
        )
      : 0,
  );
  const isEmpty = $derived(
    dashboard.data?.propertyCount === 0 && dashboard.data?.roomCount === 0,
  );
  const canAdmin = $derived(["owner", "admin"].includes(org.membership?.role));
  const invoiceRows = $derived(
    (invoices.data ?? [])
      .filter((invoice: any) => invoice.status === invoiceTab)
      .sort((a: any, b: any) => a.dueAt - b.dueAt)
      .slice(0, 5),
  );

  async function createDemo() {
    if (!org.organization?._id) return;
    seeding = true;
    error = "";
    message = "";
    try {
      const result = await seedDemo({ organizationId: org.organization._id });
      message = result.created
        ? "Data contoh berhasil dibuat. Jelajahi catatan properti, penghuni, dan tagihan di ruang kerja Anda."
        : result.message ?? "Data contoh sudah tersedia.";
    } catch (cause) {
      error = getErrorMessage(cause);
    } finally {
      seeding = false;
    }
  }
</script>

<svelte:head><title>Ikhtisar | Paviliun</title></svelte:head>
<PageHeader
  eyebrow="Buku operasional Anda"
  title="Ruang terkelola. Pikiran lega."
  description={`Lihat kabar ${org.organization?.name ?? "kos Anda"}, dari hunian hingga penerimaan bulan ini.`}
>
  {#snippet actions()}<Button href="/tagihan" variant="secondary">
      Kelola tagihan<ArrowUpRightIcon size={17} aria-hidden="true" />
    </Button>{/snippet}
</PageHeader>
<div role="status" aria-live="polite">
  {#if error}<p class="text-sm text-danger">{error}</p>{:else if message}<p
      class="text-sm text-forest"
    >
      {message}
    </p>{/if}
</div>
{#if dashboard.isLoading}<Skeleton rows={6} />
{:else if dashboard.error}<QueryError message="Ikhtisar belum dapat dimuat." />
{:else if dashboard.data && isEmpty}
  <section
    class="welcome-panel mb-8 grid gap-8 bg-forest p-7 text-white sm:p-10 lg:grid-cols-[1.3fr_1fr]"
  >
    <div>
      <p class="text-[0.65rem] uppercase tracking-[0.18em] text-white/75">
        Selamat datang di Paviliun
      </p>
      <h2 class="font-display mt-5 max-w-md text-4xl leading-tight">
        Pengelolaan yang tenang dimulai dari satu alamat.
      </h2>
      <p class="mt-4 max-w-md text-sm leading-7 text-white/80">
        Catat properti, kenali penghuni, lalu rapikan tagihan. Semua catatan
        saling terhubung di ruang kerja Anda.
      </p>
    </div>
    <ol class="self-center space-y-5 text-sm">
      {#each ["Tambahkan properti dan kamar", "Catat penghuni dan kontrak sewa", "Terbitkan tagihan pertama"] as step, i (step)}<li
          class="flex items-center gap-4 border-b border-white/20 pb-5"
        >
          <span class="font-display text-2xl text-white/65">0{i + 1}</span>
          {step}
        </li>{/each}
    </ol>
  </section>
  <EmptyState
    icon={BuildingsIcon}
    title="Mulai buku operasional Anda"
    description="Tambahkan properti pertama untuk mulai mencatat, atau jelajahi alur kerja dengan data contoh. Data contoh hanya dapat dibuat saat ruang kerja masih kosong."
  >
    {#snippet action()}<div class="flex flex-wrap justify-center gap-3">
        {#if canAdmin}<Button href="/properti">
            <PlusIcon size={17} aria-hidden="true" />Tambah properti
          </Button>{/if}{#if org.membership?.role === "owner"}<Button
            variant="secondary"
            onclick={createDemo}
            disabled={seeding}
          >
            {seeding ? "Menyiapkan contoh..." : "Jelajahi data contoh"}
          </Button>{/if}
      </div>{/snippet}
  </EmptyState>
{:else if dashboard.data}
  <div class="grid gap-6 xl:grid-cols-[1.35fr_1fr]">
    <section
      class="rounded-lg bg-forest p-7 text-white sm:p-9"
      aria-labelledby="kas-title"
    >
      <div class="flex items-center justify-between gap-3">
        <h2
          id="kas-title"
          class="text-xs font-medium uppercase tracking-[0.15em] text-white/80"
        >
          Penerimaan bulan berjalan
        </h2>
        <Tooltip.Provider>
          <Tooltip.Root>
            <Tooltip.Trigger
              class="grid size-10 place-items-center rounded-full text-white/80 hover:bg-white/10 focus-visible:outline-white"
              aria-label="Tentang penerimaan bulan berjalan"
            >
              <InfoIcon size={19} aria-hidden="true" />
            </Tooltip.Trigger><Tooltip.Portal>
              <Tooltip.Content
                sideOffset={8}
                class="z-50 max-w-72 rounded-lg border border-line bg-paper p-4 text-xs leading-6 text-ink shadow-xl"
              >
                Jumlah tagihan yang berstatus lunas sejak awal bulan,
                berdasarkan waktu Asia/Jakarta. Bukan saldo rekening.
              </Tooltip.Content>
            </Tooltip.Portal>
          </Tooltip.Root>
        </Tooltip.Provider>
      </div>
      <p
        class="tabular mt-6 break-words text-[clamp(2rem,3.8vw,3.5rem)] font-medium leading-tight tracking-[-0.05em]"
      >
        {formatCurrency(dashboard.data.paidThisMonth)}
      </p>
      <p class="mt-3 text-xs text-white/70">
        Dari tagihan yang sudah lunas bulan ini
      </p>
      <dl class="mt-9 grid gap-6 border-t border-white/20 pt-6 sm:grid-cols-2">
        <div>
          <dt class="text-xs text-white/75">Pengeluaran bulan ini</dt>
          <dd class="tabular mt-2 text-lg font-medium">
            {formatCurrency(dashboard.data.expensesThisMonth)}
          </dd>
        </div>
        <div>
          <dt class="text-xs text-white/75">Selisih tercatat</dt>
          <dd class="tabular mt-2 text-lg font-medium">
            {formatCurrency(
              dashboard.data.paidThisMonth - dashboard.data.expensesThisMonth,
            )}
          </dd>
        </div>
      </dl>
      <a
        href="/laporan"
        class="mt-7 inline-flex min-h-11 items-center gap-2 text-xs text-white/90 underline underline-offset-4"
      >
        Buka laporan keuangan<ArrowUpRightIcon size={15} aria-hidden="true" />
      </a>
    </section>
    <section
      class="surface rounded-lg p-7 sm:p-9"
      aria-labelledby="hunian-title"
    >
      <div class="flex items-center justify-between">
        <h2
          id="hunian-title"
          class="text-xs font-semibold uppercase tracking-[0.15em] text-muted"
        >
          Kondisi hunian
        </h2>
        <BuildingsIcon size={22} class="text-forest" aria-hidden="true" />
      </div>
      <p class="font-display mt-8 text-6xl font-medium tracking-tight">
        {occupancy}
        <span class="ms-1 text-3xl text-muted">%</span>
      </p>
      <p class="mt-2 text-sm text-muted">
        kamar terisi dari {dashboard.data.roomCount} kamar tercatat
      </p>
      <div
        class="mt-6 h-2 overflow-hidden rounded-full bg-forest-soft"
        role="progressbar"
        aria-label="Tingkat hunian"
        aria-valuenow={occupancy}
        aria-valuemin="0"
        aria-valuemax="100"
      >
        <div
          class="h-full rounded-full bg-forest"
          style={`width: ${occupancy}%`}
        ></div>
      </div>
      <dl class="mt-7 grid grid-cols-3 gap-3 border-t border-line pt-6">
        <div>
          <dt class="text-xs text-muted">Properti</dt>
          <dd class="tabular mt-2 text-xl">{dashboard.data.propertyCount}</dd>
        </div>
        <div>
          <dt class="text-xs text-muted">Terisi</dt>
          <dd class="tabular mt-2 text-xl">
            {dashboard.data.occupiedRoomCount}
          </dd>
        </div>
        <div>
          <dt class="text-xs text-muted">Penghuni aktif</dt>
          <dd class="tabular mt-2 text-xl">
            {dashboard.data.activeTenantCount}
          </dd>
        </div>
      </dl>
    </section>
  </div>
  <div class="my-8 grid gap-4 md:grid-cols-2">
    <a href="/tagihan" class="flex items-start gap-4 border-y border-line py-6">
      <ReceiptIcon
        size={23}
        class="mt-1 shrink-0 text-clay"
        aria-hidden="true"
      />
      <div class="flex-1">
        <p class="text-xs text-muted">Tagihan belum lunas</p>
        <p class="tabular mt-2 text-xl font-medium">
          {formatCurrency(dashboard.data.outstandingAmount)}
        </p>
        <p class="mt-2 text-xs text-muted">
          Menunggu pembayaran dan melewati jatuh tempo
        </p>
      </div>
      <ArrowUpRightIcon size={19} aria-hidden="true" />
    </a>
    <a
      href="/pemeliharaan"
      class="flex items-start gap-4 border-y border-line py-6"
    >
      <WrenchIcon
        size={23}
        class="mt-1 shrink-0 text-forest"
        aria-hidden="true"
      />
      <div class="flex-1">
        <p class="text-xs text-muted">Pemeliharaan terbuka</p>
        <p class="mt-2 text-xl font-medium">
          {dashboard.data.openMaintenanceCount} pekerjaan
        </p>
        <p class="mt-2 text-xs text-muted">
          Laporan baru dan pekerjaan yang sedang ditangani
        </p>
      </div>
      <ArrowUpRightIcon size={19} aria-hidden="true" />
    </a>
  </div>
  <section aria-labelledby="followup-title">
    <div class="mb-5 flex flex-wrap items-center justify-between gap-3">
      <div>
        <p class="text-[0.65rem] uppercase tracking-[0.16em] text-muted">
          Agenda penagihan
        </p>
        <h2 id="followup-title" class="font-display mt-2 text-3xl">
          Perlu ditindaklanjuti
        </h2>
      </div>
      <Button href="/tagihan" variant="ghost">
        Semua tagihan<ArrowUpRightIcon size={16} aria-hidden="true" />
      </Button>
    </div>
    <Tabs.Root bind:value={invoiceTab}>
      <Tabs.List class="tab-list" aria-label="Kelompok tagihan">
        <Tabs.Trigger class="tab-trigger" value="overdue">
          Lewat jatuh tempo
        </Tabs.Trigger><Tabs.Trigger class="tab-trigger" value="pending">
          Menunggu pembayaran
        </Tabs.Trigger>
      </Tabs.List>
      {#each ["overdue", "pending"] as status (status)}
        <Tabs.Content value={status}>
          {#if invoices.isLoading}<Skeleton
              rows={3}
            />{:else if invoices.error}<QueryError
              message="Agenda tagihan belum dapat dimuat."
            />{:else if !invoiceRows.length}<EmptyState
              icon={ReceiptIcon}
              title={status === "overdue"
                ? "Tidak ada tagihan terlambat"
                : "Tidak ada pembayaran yang ditunggu"}
              description="Tagihan pada kelompok ini akan tampil di sini, diurutkan dari jatuh tempo terdekat."
            />{:else}
            <div class="surface overflow-hidden rounded-lg">
              <TableScroll label="Lima tagihan terdekat">
                <table class="data-table">
                  <caption class="sr-only">
                    Maksimal lima tagihan untuk ditindaklanjuti
                  </caption>
                  <thead>
                    <tr>
                      <th>Penghuni / tagihan</th>
                      <th>Jatuh tempo</th>
                      <th class="text-end">Jumlah</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {#each invoiceRows as invoice (invoice._id)}<tr>
                        <td>
                          <p class="font-semibold">
                            {invoice.tenant?.fullName ??
                              "Penghuni tidak tersedia"}
                          </p>
                          <p class="text-xs text-muted">
                            {invoice.number} / Kamar {invoice.room?.number ??
                              "-"}
                          </p>
                        </td>
                        <td class="whitespace-nowrap">
                          {formatDate(invoice.dueAt)}
                        </td>
                        <td class="tabular text-end font-medium">
                          {formatCurrency(invoice.total)}
                        </td>
                        <td><StatusBadge status={invoice.status} /></td>
                      </tr>{/each}
                  </tbody>
                </table>
              </TableScroll>
            </div>
          {/if}
        </Tabs.Content>
      {/each}
    </Tabs.Root>
  </section>
{/if}
