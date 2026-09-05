<script lang="ts">
  import { AlertDialog } from "bits-ui";
  import { api } from "@my-better-t-app/backend/convex/_generated/api";
  import type { Id } from "@my-better-t-app/backend/convex/_generated/dataModel";
  import { useMutation, useQuery } from "convex-svelte";
  import { getOrganization } from "$lib/organization.svelte";
  import {
    dateInputToTimestamp,
    formatCurrency,
    formatDate,
    getErrorMessage,
  } from "$lib/format";
  import AppDialog from "$lib/components/AppDialog.svelte";
  import TableScroll from "$lib/components/TableScroll.svelte";
  import Button from "$lib/components/Button.svelte";
  import EmptyState from "$lib/components/EmptyState.svelte";
  import FormField from "$lib/components/FormField.svelte";
  import Input from "$lib/components/Input.svelte";
  import PageHeader from "$lib/components/PageHeader.svelte";
  import QueryError from "$lib/components/QueryError.svelte";
  import SelectField from "$lib/components/SelectField.svelte";
  import Skeleton from "$lib/components/Skeleton.svelte";
  import StatusBadge from "$lib/components/StatusBadge.svelte";
  import { FileTextIcon, PlusIcon } from "phosphor-svelte";
  const org = getOrganization();
  const leases = useQuery(api.leases.list, () =>
    org.organization?._id ? { organizationId: org.organization._id } : "skip",
  );
  const properties = useQuery(api.properties.list, () =>
    org.organization?._id ? { organizationId: org.organization._id } : "skip",
  );
  const rooms = useQuery(api.rooms.list, () =>
    org.organization?._id ? { organizationId: org.organization._id } : "skip",
  );
  const tenants = useQuery(api.tenants.list, () =>
    org.organization?._id ? { organizationId: org.organization._id } : "skip",
  );
  const createLease = useMutation(api.leases.create);
  const endLease = useMutation(api.leases.end);
  let endOpen = $state(false);
  let ending = $state(false);
  let endError = $state("");
  let endingLease = $state<{ _id: Id<"leases">; name: string; room: string } | null>(null);
  async function confirmEnd() {
    if (!endingLease || !org.organization?._id || ending || !canAdmin) return;
    ending = true;
    endError = "";
    try {
      await endLease({ organizationId: org.organization._id, leaseId: endingLease._id });
      endOpen = false;
      message = "Kontrak diakhiri. Status kamar sudah diperbarui; tagihan yang ada tetap tersimpan.";
    } catch (cause) {
      endError = getErrorMessage(cause);
    } finally {
      ending = false;
    }
  }
  let open = $state(false);
  let submitting = $state(false);
  let error = $state("");
  let message = $state("");
  let propertyId = $state("");
  let roomId = $state("");
  let tenantId = $state("");
  const propertyOptions = $derived(
    (properties.data ?? [])
      .filter((p: any) => p.isActive)
      .map((p: any) => ({ value: p._id, label: p.name })),
  );
  const roomOptions = $derived(
    (rooms.data ?? [])
      .filter(
        (r: any) => r.propertyId === propertyId && r.status === "available",
      )
      .map((r: any) => ({
        value: r._id,
        label: `Kamar ${r.number} — ${formatCurrency(r.monthlyRate)}`,
      })),
  );
  const tenantOptions = $derived(
    (tenants.data ?? [])
      .filter((t: any) => t.status === "active")
      .map((t: any) => ({ value: t._id, label: t.fullName })),
  );
  const canAdmin = $derived(["owner", "admin"].includes(org.membership?.role));
  function openForm() {
    if (!canAdmin) {
      error = "Pembuatan kontrak hanya tersedia untuk pemilik atau admin.";
      return;
    }
    error = "";
    propertyId = "";
    roomId = "";
    tenantId = "";
    open = true;
  }
  async function submit(event: SubmitEvent) {
    event.preventDefault();
    if (!org.organization?._id) return;
    const d = new FormData(event.currentTarget as HTMLFormElement);
    const startDate = dateInputToTimestamp(String(d.get("startDate") ?? ""));
    const endRaw = String(d.get("endDate") ?? "");
    const endDate = endRaw ? dateInputToTimestamp(endRaw) : undefined;
    const monthlyRent = Number(d.get("monthlyRent"));
    const securityDeposit = Number(d.get("securityDeposit"));
    const billingDay = Number(d.get("billingDay"));
    if (!propertyId || !roomId || !tenantId) {
      error = "Pilih properti, kamar tersedia, dan penghuni.";
      return;
    }
    if (
      !Number.isFinite(startDate) ||
      (endDate !== undefined &&
        (!Number.isFinite(endDate) || endDate < startDate))
    ) {
      error = "Periksa tanggal mulai dan selesai kontrak.";
      return;
    }
    if (
      !Number.isSafeInteger(monthlyRent) ||
      monthlyRent < 0 ||
      !Number.isSafeInteger(securityDeposit) ||
      securityDeposit < 0
    ) {
      error = "Harga sewa dan jaminan harus berupa rupiah bulat.";
      return;
    }
    if (!Number.isInteger(billingDay) || billingDay < 1 || billingDay > 28) {
      error = "Tanggal tagihan harus antara 1 dan 28.";
      return;
    }
    submitting = true;
    error = "";
    try {
      await createLease({
        organizationId: org.organization._id,
        propertyId: propertyId as Id<"properties">,
        roomId: roomId as Id<"rooms">,
        tenantId: tenantId as Id<"tenants">,
        startDate,
        endDate,
        monthlyRent,
        securityDeposit,
        billingDay,
        activate: d.get("activate") === "on",
      });
      open = false;
      message = "Kontrak berhasil dibuat.";
    } catch (cause) {
      error = getErrorMessage(cause);
    } finally {
      submitting = false;
    }
  }
</script>

<svelte:head><title>Kontrak | Paviliun</title></svelte:head>
<PageHeader
  eyebrow="Kesepakatan sewa"
  title="Kontrak"
  description="Hubungkan penghuni dengan kamar dan tetapkan jadwal tagihan bulanan."
>
  {#snippet actions()}{#if canAdmin}<Button onclick={openForm}>
        <PlusIcon size={17} aria-hidden="true" />Buat kontrak
      </Button>{/if}{/snippet}
</PageHeader>
{#snippet endButton(lease: NonNullable<typeof leases.data>[number])}
  {#if canAdmin && lease.status === "active"}
    <Button variant="secondary" size="sm" onclick={() => {
      endingLease = { _id: lease._id, name: lease.tenant?.fullName ?? "Penghuni", room: lease.room?.number ?? "-" };
      endError = "";
      endOpen = true;
    }}>Akhiri sewa</Button>
  {/if}
{/snippet}
<AlertDialog.Root bind:open={endOpen}>
  <AlertDialog.Portal>
    <AlertDialog.Overlay class="fixed inset-0 z-50 bg-ink/35 backdrop-blur-[2px]" />
    <AlertDialog.Content class="surface fixed start-1/2 top-1/2 z-50 max-h-[calc(100dvh-2rem)] w-[min(32rem,calc(100vw-2rem))] -translate-x-1/2 -translate-y-1/2 overflow-y-auto overscroll-contain rounded-xl p-7 sm:p-9" onEscapeKeydown={(event) => { if (ending) event.preventDefault(); }}>
      <p class="mb-4 text-xs uppercase tracking-widest text-clay">Kontrak sewa</p>
      <AlertDialog.Title class="font-display text-3xl">Akhiri sewa {endingLease?.name}?</AlertDialog.Title>
      <AlertDialog.Description class="mt-4 text-sm leading-7 text-muted">Sewa kamar {endingLease?.room} akan berakhir sekarang. Kamar menjadi tersedia bila tidak ada kontrak aktif lain. Tagihan yang sudah terbit tidak dibatalkan dan uang jaminan tidak otomatis dikembalikan. Tindakan ini tidak dapat dibatalkan melalui aplikasi.</AlertDialog.Description>
      <p class="mt-4 text-sm text-danger" role="status">{endError}</p>
      <div class="mt-7 flex flex-wrap justify-end gap-3">
        <AlertDialog.Cancel disabled={ending} class="min-h-11 rounded-md border border-line px-4 text-sm font-semibold">Kembali</AlertDialog.Cancel>
        <Button variant="danger" disabled={ending} onclick={confirmEnd}>{ending ? "Mengakhiri sewa..." : "Ya, akhiri sewa"}</Button>
      </div>
    </AlertDialog.Content>
  </AlertDialog.Portal>
</AlertDialog.Root>
<div class="mb-4 min-h-5" role="status" aria-live="polite">
  {#if message}<p class="text-sm text-forest">{message}</p>{/if}
</div>
{#if leases.isLoading}<Skeleton rows={6} />{:else if leases.error}<QueryError
    message="Daftar kontrak belum dapat dimuat."
  />{:else if !leases.data?.length}<EmptyState
    icon={FileTextIcon}
    title="Belum ada kontrak"
    description="Pastikan properti, kamar tersedia, dan penghuni sudah tercatat sebelum membuat kontrak."
  >
    {#snippet action()}<Button onclick={openForm}>
        Buat kontrak pertama
      </Button>{/snippet}
  </EmptyState>{:else}<div class="surface overflow-hidden rounded-lg">
    <TableScroll label="Daftar kontrak sewa" class="hidden md:block">
      <table class="data-table">
        <thead>
          <tr>
            <th>Penghuni</th>
            <th>Properti / kamar</th>
            <th>Masa sewa</th>
            <th>Sewa bulanan</th>
            <th>Tagihan</th>
            <th>Status</th>
            <th><span class="sr-only">Tindakan</span></th>
          </tr>
        </thead>
        <tbody>
          {#each leases.data as lease (lease._id)}<tr>
              <td class="font-semibold">
                {lease.tenant?.fullName ?? "Penghuni dihapus"}
              </td>
              <td>
                {lease.property?.name ?? "-"}
                <p class="text-xs text-muted">
                  Kamar {lease.room?.number ?? "-"}
                </p>
              </td>
              <td>
                {formatDate(lease.startDate)}
                <p class="text-xs text-muted">
                  s.d. {lease.endDate
                    ? formatDate(lease.endDate)
                    : "tanpa batas"}
                </p>
              </td>
              <td class="tabular">{formatCurrency(lease.monthlyRent)}</td>
              <td>Tanggal {lease.billingDay}</td>
              <td><StatusBadge status={lease.status} /></td>
              <td>{@render endButton(lease)}</td>
            </tr>{/each}
        </tbody>
      </table>
    </TableScroll>
    <div class="divide-y divide-line md:hidden">
      {#each leases.data as lease (lease._id)}<article class="p-4">
          <div class="flex items-start justify-between gap-3">
            <div>
              <h2 class="font-semibold">
                {lease.tenant?.fullName ?? "Penghuni dihapus"}
              </h2>
              <p class="mt-1 text-sm text-muted">
                {lease.property?.name} · Kamar {lease.room?.number}
              </p>
            </div>
            <StatusBadge status={lease.status} />
          </div>
          <dl class="mt-4 grid grid-cols-2 gap-3 text-sm">
            <div>
              <dt class="text-xs text-muted">Sewa bulanan</dt>
              <dd class="tabular mt-1 font-semibold">
                {formatCurrency(lease.monthlyRent)}
              </dd>
            </div>
            <div>
              <dt class="text-xs text-muted">Mulai</dt>
              <dd class="mt-1">{formatDate(lease.startDate)}</dd>
            </div>
          </dl>
          <div class="mt-4">{@render endButton(lease)}</div>
        </article>{/each}
    </div>
  </div>{/if}
<AppDialog
  bind:open
  title="Buat kontrak"
  description="Kontrak aktif otomatis menandai kamar sebagai terisi."
>
  <form class="space-y-4" onsubmit={submit}>
    <SelectField
      label="Properti"
      name="propertyId"
      options={propertyOptions}
      bind:value={propertyId}
      onValueChange={() => (roomId = "")}
      required
    /><SelectField
      label="Kamar tersedia"
      name="roomId"
      options={roomOptions}
      bind:value={roomId}
      disabled={!propertyId || rooms.isLoading}
      required
      hint={propertyId && roomOptions.length === 0
        ? "Tidak ada kamar tersedia di properti ini."
        : ""}
    /><SelectField
      label="Penghuni"
      name="tenantId"
      options={tenantOptions}
      bind:value={tenantId}
      required
    />
    <div class="grid gap-4 sm:grid-cols-2">
      <FormField label="Tanggal mulai" name="startDate" required>
        {#snippet children({ id, describedby })}<Input
            {id}
            name="startDate"
            type="date"
            aria-describedby={describedby}
          />{/snippet}
      </FormField><FormField
        label="Tanggal selesai"
        name="endDate"
        hint="Opsional."
      >
        {#snippet children({ id, describedby })}<Input
            {id}
            name="endDate"
            type="date"
            aria-describedby={describedby}
          />{/snippet}
      </FormField>
    </div>
    <div class="grid gap-4 sm:grid-cols-2">
      <FormField label="Sewa bulanan" name="monthlyRent" required>
        {#snippet children({ id, describedby })}<Input
            {id}
            name="monthlyRent"
            type="number"
            min="0"
            step="1"
            inputmode="numeric"
            aria-describedby={describedby}
          />{/snippet}
      </FormField><FormField
        label="Uang jaminan"
        name="securityDeposit"
        required
      >
        {#snippet children({ id, describedby })}<Input
            {id}
            name="securityDeposit"
            type="number"
            min="0"
            step="1"
            inputmode="numeric"
            value="0"
            aria-describedby={describedby}
          />{/snippet}
      </FormField>
    </div>
    <FormField
      label="Tanggal tagihan bulanan"
      name="billingDay"
      required
      hint="Gunakan tanggal 1 sampai 28."
    >
      {#snippet children({ id, describedby })}<Input
          {id}
          name="billingDay"
          type="number"
          min="1"
          max="28"
          step="1"
          inputmode="numeric"
          value="5"
          aria-describedby={describedby}
        />{/snippet}
    </FormField>
    <label
      class="flex min-h-11 items-center gap-3 rounded-md bg-forest-soft px-3 text-sm"
    >
      <input
        type="checkbox"
        name="activate"
        checked
        class="size-4 accent-forest"
      />
      Aktifkan kontrak sekarang
    </label>
    <p class="min-h-5 text-sm text-danger" role="status">{open ? error : ""}</p>
    <div class="flex justify-end gap-2">
      <Button variant="secondary" onclick={() => (open = false)}>
        Batal
      </Button><Button type="submit" disabled={submitting}>
        {submitting ? "Menyimpan..." : "Simpan kontrak"}
      </Button>
    </div>
  </form>
</AppDialog>
