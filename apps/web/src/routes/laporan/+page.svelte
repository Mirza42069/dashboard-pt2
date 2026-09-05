<script lang="ts">
  import { api } from "@my-better-t-app/backend/convex/_generated/api";
  import { useQuery } from "convex-svelte";
  import { getOrganization } from "$lib/organization.svelte";
  import { formatCurrency, formatPeriod } from "$lib/format";
  import Metric from "$lib/components/Metric.svelte";
  import TableScroll from "$lib/components/TableScroll.svelte";
  import EmptyState from "$lib/components/EmptyState.svelte";
  import PageHeader from "$lib/components/PageHeader.svelte";
  import QueryError from "$lib/components/QueryError.svelte";
  import Skeleton from "$lib/components/Skeleton.svelte";
  import {
    ChartLineUpIcon,
    ReceiptIcon,
    TrendUpIcon,
    WalletIcon,
  } from "phosphor-svelte";
  const org = getOrganization();
  const dashboard = useQuery(api.dashboard.get, () =>
    org.organization?._id ? { organizationId: org.organization._id } : "skip",
  );
  const invoices = useQuery(api.invoices.list, () =>
    org.organization?._id ? { organizationId: org.organization._id } : "skip",
  );
  const payments = useQuery(api.payments.list, () =>
    org.organization?._id ? { organizationId: org.organization._id } : "skip",
  );
  const expenses = useQuery(api.expenses.list, () =>
    org.organization?._id ? { organizationId: org.organization._id } : "skip",
  );
  const rows = $derived.by(() => {
    const map = new Map<
      string,
      { period: string; invoiced: number; paid: number; expenses: number }
    >();
    for (const inv of invoices.data ?? []) {
      const row = map.get(inv.period) ?? {
        period: inv.period,
        invoiced: 0,
        paid: 0,
        expenses: 0,
      };
      if (inv.status !== "void") row.invoiced += inv.total;
      map.set(inv.period, row);
    }
    for (const pay of payments.data ?? []) {
      if (pay.status !== "succeeded") continue;
      const inv = invoices.data?.find((x: any) => x._id === pay.invoiceId);
      if (!inv) continue;
      const row = map.get(inv.period) ?? {
        period: inv.period,
        invoiced: 0,
        paid: 0,
        expenses: 0,
      };
      row.paid += pay.amount;
      map.set(inv.period, row);
    }
    for (const expense of expenses.data ?? []) {
      const d = new Date(expense.incurredAt);
      const period = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      const row = map.get(period) ?? {
        period,
        invoiced: 0,
        paid: 0,
        expenses: 0,
      };
      row.expenses += expense.amount;
      map.set(period, row);
    }
    return [...map.values()].sort((a, b) => b.period.localeCompare(a.period));
  });
  const allPaid = $derived(
    (payments.data ?? [])
      .filter((p: any) => p.status === "succeeded")
      .reduce((s: number, p: any) => s + p.amount, 0),
  );
  const allExpenses = $derived(
    (expenses.data ?? []).reduce((s: number, e: any) => s + e.amount, 0),
  );
</script>

<svelte:head><title>Laporan | Paviliun</title></svelte:head><PageHeader
  eyebrow="Ringkasan manajerial"
  title="Laporan operasional"
  description="Perbandingan sederhana dari tagihan, pembayaran Xendit, dan pengeluaran yang tersedia di Paviliun."
/>
{#if dashboard.isLoading || invoices.isLoading || payments.isLoading || expenses.isLoading}<Skeleton
    rows={7}
  />{:else if dashboard.error || invoices.error || payments.error || expenses.error}<QueryError
    message="Laporan belum dapat dihitung karena sebagian data gagal dimuat."
  />{:else}<div class="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
    <Metric
      label="Penerimaan tercatat"
      value={formatCurrency(allPaid)}
      note="Pembayaran berstatus berhasil"
      icon={TrendUpIcon}
    /><Metric
      label="Pengeluaran tercatat"
      value={formatCurrency(allExpenses)}
      note="Seluruh periode"
      icon={WalletIcon}
    /><Metric
      label="Selisih sederhana"
      value={formatCurrency(allPaid - allExpenses)}
      note="Bukan laba bersih"
      icon={ChartLineUpIcon}
    /><Metric
      label="Piutang saat ini"
      value={formatCurrency(dashboard.data?.outstandingAmount)}
      note="Menunggu dan terlambat"
      icon={ReceiptIcon}
    />
  </div>
  <section class="surface mt-6 overflow-hidden rounded-lg">
    <header class="p-7">
      <h2 class="font-display text-2xl font-medium">
        Rekap per periode tagihan
      </h2>
      <p class="mt-1 text-sm text-muted">
        Pembayaran dikelompokkan menurut periode tagihannya; pengeluaran menurut
        tanggal transaksi.
      </p>
    </header>
    {#if rows.length}<p class="px-7 pb-3 text-xs text-muted sm:hidden">
        Geser tabel untuk melihat seluruh nilai.
      </p>
      <TableScroll label="Rekap keuangan per periode">
        <table class="data-table">
          <thead>
            <tr>
              <th>Periode</th>
              <th class="text-end">Ditagihkan</th>
              <th class="text-end">Dibayar</th>
              <th class="text-end">Pengeluaran</th>
              <th class="text-end">Selisih kas</th>
            </tr>
          </thead>
          <tbody>
            {#each rows as row (row.period)}<tr>
                <td class="font-semibold">{formatPeriod(row.period)}</td>
                <td class="tabular text-end">{formatCurrency(row.invoiced)}</td>
                <td class="tabular text-end text-forest">
                  {formatCurrency(row.paid)}
                </td>
                <td class="tabular text-end text-clay">
                  {formatCurrency(row.expenses)}
                </td>
                <td class="tabular text-end font-semibold">
                  {formatCurrency(row.paid - row.expenses)}
                </td>
              </tr>{/each}
          </tbody>
        </table>
      </TableScroll>{:else}<EmptyState
        icon={ChartLineUpIcon}
        title="Laporan dimulai dari catatan pertama"
        description="Tagihan, pembayaran, dan pengeluaran akan membentuk rekap bulanan Anda secara otomatis."
      />{/if}
  </section>
  <aside class="mt-5 rounded-lg border border-clay/25 bg-clay-soft p-4">
    <h2 class="text-sm font-semibold text-danger">Batas laporan</h2>
    <p class="pretty mt-1 text-sm leading-6 text-muted">
      Ringkasan ini dihitung di perangkat dari data yang tersedia, tanpa saldo
      awal, pajak, depresiasi, pembayaran di luar Xendit, atau rekonsiliasi
      rekening bank. Gunakan sebagai pantauan operasional, bukan laporan
      akuntansi resmi.
    </p>
  </aside>{/if}
