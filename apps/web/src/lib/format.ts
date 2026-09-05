export const formatCurrency = (value: number | null | undefined) =>
  new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(value ?? 0);

export const formatDate = (value: number | string | Date | null | undefined) => {
  if (!value) return 'Belum ditentukan';
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? 'Tanggal tidak valid' : new Intl.DateTimeFormat('id-ID', { day: '2-digit', month: 'short', year: 'numeric', timeZone: 'Asia/Jakarta' }).format(date);
};

export const formatDateTime = (value: number | null | undefined) => {
  if (!value) return 'Belum ditentukan';
  return new Intl.DateTimeFormat('id-ID', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Jakarta' }).format(value);
};

export const formatPeriod = (period: string | null | undefined) => {
  if (!period || !/^\d{4}-\d{2}$/.test(period)) return period ?? '-';
  const [year, month] = period.split('-').map(Number);
  return new Intl.DateTimeFormat('id-ID', { month: 'long', year: 'numeric', timeZone: 'Asia/Jakarta' }).format(new Date(Date.UTC(year, month - 1, 1)));
};

export const currentPeriod = () => {
  const parts = new Intl.DateTimeFormat('en-CA', { year: 'numeric', month: '2-digit', timeZone: 'Asia/Jakarta' }).formatToParts(new Date());
  return `${parts.find((p) => p.type === 'year')?.value}-${parts.find((p) => p.type === 'month')?.value}`;
};

export const dateInputToTimestamp = (value: string) => value ? new Date(`${value}T00:00:00+07:00`).getTime() : NaN;

export const getErrorMessage = (error: unknown, fallback = 'Tindakan gagal. Periksa koneksi lalu coba lagi.') => {
  if (error instanceof Error && error.message) return error.message.replace(/^\[CONVEX [^\]]+\]\s*/, '');
  return fallback;
};

const labels: Record<string, string> = {
  available: 'Tersedia', occupied: 'Terisi', maintenance: 'Pemeliharaan', inactive: 'Nonaktif',
  draft: 'Draf', active: 'Aktif', ended: 'Selesai', pending: 'Menunggu', paid: 'Lunas', overdue: 'Terlambat', void: 'Dibatalkan',
  succeeded: 'Berhasil', failed: 'Gagal', refunded: 'Dikembalikan', expired: 'Kedaluwarsa',
  open: 'Terbuka', in_progress: 'Dikerjakan', resolved: 'Tuntas', closed: 'Ditutup',
  low: 'Rendah', medium: 'Sedang', high: 'Tinggi', urgent: 'Mendesak', owner: 'Pemilik', admin: 'Admin', staff: 'Staf'
};
export const statusLabel = (status: string) => labels[status] ?? status;
export const phoneForWhatsApp = (phone?: string) => phone?.replace(/\D/g, '').replace(/^0/, '62') ?? '';
