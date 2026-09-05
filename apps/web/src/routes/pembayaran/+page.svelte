<script lang="ts">
  import { api } from "@my-better-t-app/backend/convex/_generated/api";
  import { useQuery } from "convex-svelte";
  import { getOrganization } from "$lib/organization.svelte";
  import { formatCurrency, formatDateTime } from "$lib/format";
  import EmptyState from "$lib/components/EmptyState.svelte";
  import PageHeader from "$lib/components/PageHeader.svelte";
  import QueryError from "$lib/components/QueryError.svelte";
  import Skeleton from "$lib/components/Skeleton.svelte";
  import StatusBadge from "$lib/components/StatusBadge.svelte";
  import { BankIcon } from "phosphor-svelte";
  import TableScroll from "$lib/components/TableScroll.svelte";
  const org = getOrganization();
  const payments = useQuery(api.payments.list, () =>
    org.organization?._id ? { organizationId: org.organization._id } : "skip",
  );
  const invoices = useQuery(api.invoices.list, () =>
    org.organization?._id ? { organizationId: org.organization._id } : "skip",
  );
  const invoiceOf = (id: string) =>
    invoices.data?.find((x: any) => x._id === id);
  const total = $derived(
    (payments.data ?? [])
      .filter((p: any) => p.status === "succeeded")
      .reduce((sum: number, p: any) => sum + p.amount, 0),
  );
</script>

<svelte:head><title>Pembayaran | Paviliun</title></svelte:head><PageHeader
  eyebrow="Penerimaan terverifikasi"
  title="Pembayaran"
  description="Pembayaran yang dikonfirmasi Xendit tercatat di sini. Status tagihan diperbarui secara otomatis."
/>
{#if !payments.isLoading && !payments.error}
  <div class="mb-8 border-s-2 border-forest ps-6 py-2">
    <p class="text-xs text-muted">
      Total pembayaran berhasil / seluruh periode
    </p>
    <p class="tabular mt-3 text-3xl font-medium tracking-tight text-forest">
      {formatCurrency(total)}
    </p>
  </div>
{/if}
{#if payments.isLoading || invoices.isLoading}<Skeleton
    rows={6}
  />{:else if payments.error || invoices.error}<QueryError
    message="Daftar pembayaran belum dapat dimuat."
  />{:else if !payments.data?.length}<EmptyState
    icon={BankIcon}
    title="Belum ada pembayaran"
    description="Pembayaran QRIS yang dikonfirmasi Xendit akan muncul otomatis di sini."
  />{:else}<div class="surface overflow-hidden rounded-lg">
    <TableScroll label="Daftar pembayaran" class="hidden md:block">
      <table class="data-table">
        <thead>
          <tr>
            <th>Waktu bayar</th>
            <th>Tagihan</th>
            <th>Penghuni / kamar</th>
            <th>Metode</th>
            <th>Jumlah</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          {#each payments.data as payment (payment._id)}{@const invoice =
              invoiceOf(payment.invoiceId)}
            <tr>
              <td>{formatDateTime(payment.paidAt)}</td>
              <td class="font-semibold">
                {invoice?.number ?? payment.invoiceId}
              </td>
              <td>
                {invoice?.tenant?.fullName ?? "-"}
                <p class="text-xs text-muted">
                  Kamar {invoice?.room?.number ?? "-"}
                </p>
              </td>
              <td>{payment.method}</td>
              <td class="tabular font-semibold">
                {formatCurrency(payment.amount)}
              </td>
              <td><StatusBadge status={payment.status} /></td>
            </tr>{/each}
        </tbody>
      </table>
    </TableScroll>
    <div class="divide-y divide-line md:hidden">
      {#each payments.data as payment (payment._id)}{@const invoice = invoiceOf(
          payment.invoiceId,
        )}
        <article class="p-4">
          <div class="flex items-start justify-between gap-3">
            <div>
              <p class="text-xs text-muted">{invoice?.number ?? "Tagihan"}</p>
              <h2 class="mt-1 font-semibold">
                {invoice?.tenant?.fullName ?? "-"}
              </h2>
            </div>
            <StatusBadge status={payment.status} />
          </div>
          <p class="font-display tabular mt-4 text-xl font-semibold">
            {formatCurrency(payment.amount)}
          </p>
          <p class="mt-1 text-xs text-muted">
            {formatDateTime(payment.paidAt)} · {payment.method}
          </p>
        </article>{/each}
    </div>
  </div>{/if}
