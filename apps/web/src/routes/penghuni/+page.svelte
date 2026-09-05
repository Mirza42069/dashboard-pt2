<script lang="ts">
  import { api } from "@my-better-t-app/backend/convex/_generated/api";
  import { useMutation, useQuery } from "convex-svelte";
  import { getOrganization } from "$lib/organization.svelte";
  import { formatDate, getErrorMessage } from "$lib/format";
  import AppDialog from "$lib/components/AppDialog.svelte";
  import TableScroll from "$lib/components/TableScroll.svelte";
  import Button from "$lib/components/Button.svelte";
  import EmptyState from "$lib/components/EmptyState.svelte";
  import FormField from "$lib/components/FormField.svelte";
  import Input from "$lib/components/Input.svelte";
  import PageHeader from "$lib/components/PageHeader.svelte";
  import QueryError from "$lib/components/QueryError.svelte";
  import Skeleton from "$lib/components/Skeleton.svelte";
  import StatusBadge from "$lib/components/StatusBadge.svelte";
  import {
    MagnifyingGlassIcon,
    PlusIcon,
    ShieldCheckIcon,
    UsersThreeIcon,
  } from "phosphor-svelte";
  const org = getOrganization();
  const tenants = useQuery(api.tenants.list, () =>
    org.organization?._id ? { organizationId: org.organization._id } : "skip",
  );
  const createTenant = useMutation(api.tenants.create);
  let search = $state("");
  let open = $state(false);
  let submitting = $state(false);
  let error = $state("");
  let message = $state("");
  let showNik = $state(false);
  const filtered = $derived(
    (tenants.data ?? []).filter((t: any) =>
      `${t.fullName} ${t.phone ?? ""} ${t.email ?? ""}`
        .toLowerCase()
        .includes(search.toLowerCase().trim()),
    ),
  );
  async function submit(event: SubmitEvent) {
    event.preventDefault();
    if (!org.organization?._id) return;
    const form = event.currentTarget as HTMLFormElement;
    const data = new FormData(form);
    const fullName = String(data.get("fullName") ?? "").trim();
    const email = String(data.get("email") ?? "").trim();
    if (fullName.length < 2) {
      error = "Masukkan nama lengkap sedikitnya 2 karakter.";
      return;
    }
    if (email && !/^\S+@\S+\.\S+$/.test(email)) {
      error = "Masukkan alamat email yang valid atau kosongkan bidang email.";
      return;
    }
    submitting = true;
    error = "";
    try {
      await createTenant({
        organizationId: org.organization._id,
        fullName,
        phone: String(data.get("phone") ?? "").trim() || undefined,
        email: email || undefined,
        nik: String(data.get("nik") ?? "").trim() || undefined,
        emergencyContact:
          String(data.get("emergencyContact") ?? "").trim() || undefined,
      });
      open = false;
      message = "Penghuni berhasil dicatat.";
      form.reset();
    } catch (cause) {
      error = getErrorMessage(cause);
    } finally {
      submitting = false;
    }
  }
</script>

<svelte:head><title>Penghuni | Paviliun</title></svelte:head>
<PageHeader
  eyebrow="Buku penghuni"
  title="Penghuni"
  description="Simpan kontak seperlunya. NIK bersifat sensitif dan tidak ditampilkan kembali di daftar."
>
  {#snippet actions()}<Button
      onclick={() => {
        error = "";
        open = true;
      }}
    >
      <PlusIcon size={17} aria-hidden="true" />Tambah penghuni
    </Button>{/snippet}
</PageHeader>
<div
  class="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"
>
  <div class="relative w-full max-w-md">
    <label class="sr-only" for="cari-penghuni">Cari penghuni</label>
    <MagnifyingGlassIcon
      size={18}
      class="pointer-events-none absolute start-3 top-1/2 -translate-y-1/2 text-muted"
      aria-hidden="true"
    />
    <input
      id="cari-penghuni"
      class="input-base ps-10"
      type="search"
      bind:value={search}
      placeholder="Cari nama, telepon, atau email"
    />
  </div>
  <p class="text-sm text-muted" role="status">
    {filtered.length} penghuni ditemukan
  </p>
</div>
<div class="mb-3 min-h-5" role="status" aria-live="polite">
  {#if message}<p class="text-sm text-forest">{message}</p>{/if}
</div>
{#if tenants.isLoading}<Skeleton rows={6} />{:else if tenants.error}<QueryError
    message="Daftar penghuni belum dapat dimuat."
  />{:else if !tenants.data?.length}<EmptyState
    icon={UsersThreeIcon}
    title="Belum ada penghuni"
    description="Catat identitas dan kontak penghuni sebelum membuat kontrak."
  >
    {#snippet action()}<Button onclick={() => (open = true)}>
        Tambah penghuni pertama
      </Button>{/snippet}
  </EmptyState>{:else if !filtered.length}<EmptyState
    icon={MagnifyingGlassIcon}
    title="Penghuni tidak ditemukan"
    description={`Tidak ada hasil untuk “${search}”. Ubah kata pencarian untuk melihat data lain.`}
  />{:else}<div class="surface overflow-hidden rounded-lg">
    <TableScroll label="Daftar penghuni" class="hidden md:block">
      <table class="data-table">
        <thead>
          <tr>
            <th>Nama</th>
            <th>Kontak</th>
            <th>Status</th>
            <th>Tercatat</th>
          </tr>
        </thead>
        <tbody>
          {#each filtered as tenant (tenant._id)}<tr>
              <td class="font-semibold">{tenant.fullName}</td>
              <td>
                <p>{tenant.phone || "-"}</p>
                <p class="text-xs text-muted">
                  {tenant.email || "Email tidak dicatat"}
                </p>
              </td>
              <td><StatusBadge status={tenant.status} /></td>
              <td>{formatDate(tenant.createdAt)}</td>
            </tr>{/each}
        </tbody>
      </table>
    </TableScroll>
    <div class="divide-y divide-line md:hidden">
      {#each filtered as tenant (tenant._id)}<article class="p-4">
          <div class="flex items-start justify-between gap-3">
            <h2 class="font-semibold">{tenant.fullName}</h2>
            <StatusBadge status={tenant.status} />
          </div>
          <p class="mt-2 text-sm">
            {tenant.phone || "Nomor telepon tidak dicatat"}
          </p>
          <p class="mt-1 break-words text-sm text-muted">
            {tenant.email || "Email tidak dicatat"}
          </p>
        </article>{/each}
    </div>
  </div>{/if}
<AppDialog
  bind:open
  title="Tambah penghuni"
  description="Catat data yang benar-benar diperlukan untuk operasional dan kontrak."
>
  <form class="space-y-4" onsubmit={submit}>
    <FormField label="Nama lengkap" name="fullName" required>
      {#snippet children({ id, describedby })}<Input
          {id}
          name="fullName"
          autocomplete="name"
          placeholder="Budi Santoso"
          aria-describedby={describedby}
        />{/snippet}
    </FormField>
    <div class="grid gap-4 sm:grid-cols-2">
      <FormField label="Nomor telepon" name="phone">
        {#snippet children({ id, describedby })}<Input
            {id}
            name="phone"
            type="tel"
            inputmode="tel"
            autocomplete="tel"
            placeholder="0812 3456 7890"
            aria-describedby={describedby}
          />{/snippet}
      </FormField><FormField label="Email" name="email">
        {#snippet children({ id, describedby })}<Input
            {id}
            name="email"
            type="email"
            inputmode="email"
            autocomplete="email"
            placeholder="nama@contoh.id"
            aria-describedby={describedby}
          />{/snippet}
      </FormField>
    </div>
    <div class="rounded-lg bg-clay-soft p-3">
      <p class="flex items-center gap-2 text-sm font-semibold text-danger">
        <ShieldCheckIcon size={17} aria-hidden="true" />Data sensitif
      </p>
      <p class="mt-1 text-xs leading-5 text-muted">
        NIK hanya dicatat bila diperlukan. Pastikan Anda memiliki dasar dan izin
        penyimpanan yang sesuai.
      </p>
    </div>
    <FormField
      label="NIK"
      name="nik"
      hint="Opsional. NIK tidak ditampilkan di tabel penghuni."
    >
      {#snippet children({ id, describedby })}<div class="relative">
          <Input
            {id}
            name="nik"
            type={showNik ? "text" : "password"}
            inputmode="numeric"
            autocomplete="off"
            class="pe-28"
            aria-describedby={describedby}
          />
          <button
            type="button"
            class="absolute end-0 top-0 flex min-h-11 min-w-24 items-center justify-center px-3 text-xs text-muted"
            aria-label={showNik ? "Sembunyikan NIK" : "Tampilkan NIK"}
            onclick={() => (showNik = !showNik)}
          >
            {showNik ? "Sembunyikan" : "Lihat"}
          </button>
        </div>{/snippet}
    </FormField><FormField label="Kontak darurat" name="emergencyContact">
      {#snippet children({ id, describedby })}<Input
          {id}
          name="emergencyContact"
          placeholder="Nama dan nomor telepon"
          aria-describedby={describedby}
        />{/snippet}
    </FormField>
    <p class="min-h-5 text-sm text-danger" role="status">{open ? error : ""}</p>
    <div class="flex justify-end gap-2">
      <Button variant="secondary" onclick={() => (open = false)}>
        Batal
      </Button><Button type="submit" disabled={submitting}>
        {submitting ? "Menyimpan..." : "Simpan penghuni"}
      </Button>
    </div>
  </form>
</AppDialog>
