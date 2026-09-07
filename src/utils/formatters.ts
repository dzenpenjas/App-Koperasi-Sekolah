export function formatCurrency(amount: number): string {
  if (isNaN(amount)) return 'Rp 0';
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

export function formatDate(isoString?: string): string {
  if (!isoString) return '-';
  try {
    const d = new Date(isoString);
    return new Intl.DateTimeFormat('id-ID', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(d);
  } catch {
    return isoString;
  }
}

export function formatDateOnly(isoString?: string): string {
  if (!isoString) return '-';
  try {
    const d = new Date(isoString);
    return new Intl.DateTimeFormat('id-ID', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    }).format(d);
  } catch {
    return isoString;
  }
}

export function formatNumber(num: number): string {
  if (isNaN(num)) return '0';
  return new Intl.NumberFormat('id-ID').format(num);
}
