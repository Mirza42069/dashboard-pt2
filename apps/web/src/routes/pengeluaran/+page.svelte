<script lang="ts">
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
  import { PlusIcon, WalletIcon } from "phosphor-svelte";
  const org = getOrganization();
  const expenses = useQuery(api.expenses.list, () =>
    org.organization?._id ? { organizationId: org.organization._id } : "skip",
  );
  const properties = useQuery(api.properties.list, () =>
    org.organization?._id ? { organizationId: org.organization._id } : "skip",
  );
  const createExpense = useMutation(api.expenses.create);
  let open = $state(false);
  let submitting = $state(false);
  let error = $state("");
  let message = $state("");
  let propertyId = $state("");
  const propertyOptions = $derived([
    { value: "all", label: "Umum / seluruh properti" },
    ...(properties.data ?? []).map((p: any) => ({
      value: p._id,
      label: p.name,
    })),
  ]);
  const propertyName = (id: string) =>
    properties.data?.find((p: any) => p._id === id)?.name ?? "Umum";
  const total = $derived(
    (expenses.data ?? []).reduce((sum: number, e: any) => sum + e.amount, 0),
  );
  async function submit(event: SubmitEvent) {
    event.preventDefault();
    if (!org.organization?._id) return;
    const d = new FormData(event.currentTarget as HTMLFormElement);
    const category = String(d.get("category") ?? "").trim(),
      description = String(d.get("description") ?? "").trim(),
      vendor = String(d.get("vendor") ?? "").trim();
    const amount = Number(d.get("amount")),
      incurredAt = dateInputToTimestamp(String(d.get("incurredAt") ?? ""));
    if (
      !category ||
      !description ||
      !Number.isSafeInteger(amount) ||
      amount <= 0 ||
      !Number.isFinite(incurredAt)
    ) {
      error = "Lengkapi kategori, keterangan, jumlah rupiah, dan tanggal.";
      return;
    }
    submitting = true;
    error = "";
    try {
      await createExpense({
        organizationId: org.organization._id,
        propertyId: propertyId && propertyId !== "all" ? propertyId as Id<"properties"> : undefined,
        category,
        description,
        amount,
        vendor: vendor || undefined,
        incurredAt,
      });
      open = false;
      propertyId = "";
      message = "Pengeluaran berhasil dicatat.";
    } catch (cause) {
      error = getErrorMessage(cause);
    } finally {
      submitting = false;
    }
  }
</script>

<svelte:head><title>Pengeluaran | Paviliun</title></svelte:head><PageHeader
  eyebrow="Buku kas keluar"
  title="Pengeluaran"
  description="Catat biaya operasional beserta properti dan pemasok bila tersedia."
>
  {#snippet actions()}<Button
      onclick={() => {
        error = "";
        open = true;
      }}
    >
      <PlusIcon size={17} aria-hidden="true" />Catat pengeluaran
    </Button>{/snippet}
</PageHeader>
<div class="mb-8 grid gap-5 sm:grid-cols-[1fr_auto] sm:items-end">
  {#if !expenses.isLoading && !expenses.error}<div
      class="border-s-2 border-clay py-2 ps-6"
    >
      <p class="text-sm text-muted">Total seluruh catatan</p>
      <p class="tabular mt-3 text-3xl font-medium tracking-tight">
        {formatCurrency(total)}
      </p>
    </div>{/if}
  <p class="min-h-5 text-sm text-forest" role="status">{message}</p>
</div>
{#if expenses.isLoading || properties.isLoading}<Skeleton
    rows={6}
  />{:else if expenses.error || properties.error}<QueryError
    message="Daftar pengeluaran belum dapat dimuat."
  />{:else if !expenses.data?.length}<EmptyState
    icon={WalletIcon}
    title="Belum ada pengeluaran"
    description="Catat biaya kebersihan, perbaikan, utilitas, atau kebutuhan operasional lainnya."
  >
    {#snippet action()}<Button onclick={() => (open = true)}>
        Catat pengeluaran pertama
      </Button>{/snippet}
  </EmptyState>{:else}<div class="surface overflow-hidden rounded-lg">
    <TableScroll label="Daftar pengeluaran" class="hidden md:block">
      <table class="data-table">
        <thead>
          <tr>
            <th>Tanggal</th>
            <th>Kategori</th>
            <th>Keterangan</th>
            <th>Properti</th>
            <th>Pemasok</th>
            <th class="text-end">Jumlah</th>
          </tr>
        </thead>
        <tbody>
          {#each expenses.data as expense (expense._id)}<tr>
              <td>{formatDate(expense.incurredAt)}</td>
              <td class="font-semibold">{expense.category}</td>
              <td>{expense.description}</td>
              <td>
                {expense.propertyId ? propertyName(expense.propertyId) : "Umum"}
              </td>
              <td>{expense.vendor || "-"}</td>
              <td class="tabular text-end font-semibold">
                {formatCurrency(expense.amount)}
              </td>
            </tr>{/each}
        </tbody>
      </table>
    </TableScroll>
    <div class="divide-y divide-line md:hidden">
      {#each expenses.data as expense (expense._id)}<article class="p-4">
          <div class="flex flex-wrap items-start justify-between gap-4">
            <div>
              <h2 class="font-semibold">{expense.category}</h2>
              <p class="mt-1 text-sm text-muted">{expense.description}</p>
            </div>
            <p class="tabular whitespace-nowrap font-semibold">
              {formatCurrency(expense.amount)}
            </p>
          </div>
          <p class="mt-3 text-xs text-muted">
            {formatDate(expense.incurredAt)} · {expense.propertyId
              ? propertyName(expense.propertyId)
              : "Umum"}
          </p>
        </article>{/each}
    </div>
  </div>{/if}
<AppDialog
  bind:open
  title="Catat pengeluaran"
  description="Simpan nilai rupiah bulat sesuai bukti transaksi."
>
  <form class="space-y-4" onsubmit={submit}>
    <SelectField
      label="Properti"
      name="propertyId"
      options={propertyOptions}
      bind:value={propertyId}
      placeholder="Umum / seluruh properti"
    />
    <div class="grid gap-4 sm:grid-cols-2">
      <FormField label="Kategori" name="category" required>
        {#snippet children({ id, describedby })}<Input
            {id}
            name="category"
            placeholder="Kebersihan"
            aria-describedby={describedby}
          />{/snippet}
      </FormField><FormField label="Tanggal" name="incurredAt" required>
        {#snippet children({ id, describedby })}<Input
            {id}
            name="incurredAt"
            type="date"
            aria-describedby={describedby}
          />{/snippet}
      </FormField>
    </div>
    <FormField label="Keterangan" name="description" required>
      {#snippet children({ id, describedby })}<Input
          {id}
          name="description"
          placeholder="Perlengkapan kebersihan bulanan"
          aria-describedby={describedby}
        />{/snippet}
    </FormField>
    <div class="grid gap-4 sm:grid-cols-2">
      <FormField label="Jumlah" name="amount" required>
        {#snippet children({ id, describedby })}<Input
            {id}
            name="amount"
            type="number"
            min="1"
            step="1"
            inputmode="numeric"
            placeholder="250000"
            aria-describedby={describedby}
          />{/snippet}
      </FormField><FormField label="Pemasok" name="vendor">
        {#snippet children({ id, describedby })}<Input
            {id}
            name="vendor"
            placeholder="Toko Bersih"
            aria-describedby={describedby}
          />{/snippet}
      </FormField>
    </div>
    <p class="min-h-5 text-sm text-danger" role="status">{open ? error : ""}</p>
    <div class="flex justify-end gap-2">
      <Button variant="secondary" onclick={() => (open = false)}>
        Batal
      </Button><Button type="submit" disabled={submitting}>
        {submitting ? "Menyimpan..." : "Simpan pengeluaran"}
      </Button>
    </div>
  </form>
</AppDialog>
