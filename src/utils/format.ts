import { AppSettings } from '../types';

export function formatNumber(val: number | null | undefined, decimals = 2): string {
  const num = Number(val);
  const safe = Number.isFinite(num) ? num : 0;
  return safe.toLocaleString('en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

export function formatMoney(val: number | null | undefined, decimals = 0): string {
  const num = Number(val);
  const safe = Number.isFinite(num) ? num : 0;
  return safe.toLocaleString('en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

export function formatDateTime(iso: string | null | undefined, settings?: Partial<AppSettings>): string {
  if (!iso) return '—';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return String(iso);

  // Apply configured timezone offset in hours relative to UTC
  const tz = Number.isFinite(Number(settings?.tzOffset)) ? Number(settings?.tzOffset) : 2;
  const shifted = new Date(date.getTime() + tz * 3600_000);
  const dd = String(shifted.getUTCDate()).padStart(2, '0');
  const mm = String(shifted.getUTCMonth() + 1).padStart(2, '0');
  const yyyy = shifted.getUTCFullYear();

  let datePart = `${dd}.${mm}.${yyyy}`;
  if (settings?.dateFormat === 'YYYY-MM-DD') datePart = `${yyyy}-${mm}-${dd}`;
  if (settings?.dateFormat === 'MM/DD/YYYY') datePart = `${mm}/${dd}/${yyyy}`;

  let hours = shifted.getUTCHours();
  const mins = String(shifted.getUTCMinutes()).padStart(2, '0');
  let timePart = `${String(hours).padStart(2, '0')}:${mins}`;
  if (settings?.clockFormat === '12h') {
    const suffix = hours >= 12 ? 'PM' : 'AM';
    hours = hours % 12 || 12;
    timePart = `${hours}:${mins} ${suffix}`;
  }

  return `${datePart} ${timePart}`;
}

export function formatRemainingMinutes(expiresAt: string | null | undefined, lang: 'ar' | 'en'): string {
  if (!expiresAt) return lang === 'ar' ? 'منتهي' : 'Expired';
  const ts = new Date(expiresAt).getTime();
  if (Number.isNaN(ts)) return lang === 'ar' ? 'منتهي' : 'Expired';
  const diffMs = ts - Date.now();
  if (diffMs <= 0) return lang === 'ar' ? 'منتهي' : 'Expired';
  const totalSec = Math.floor(diffMs / 1000);
  const mins = Math.floor(totalSec / 60);
  const secs = totalSec % 60;
  return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}

export function downloadCsv(filename: string, headers: string[], rows: (string | number)[][]) {
  const escape = (cell: string | number) => {
    const str = String(cell ?? '');
    if (str.includes(',') || str.includes('"') || str.includes('\n')) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
  };
  const csvContent =
    '\uFEFF' + [headers.map(escape).join(','), ...rows.map((r) => r.map(escape).join(','))].join('\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
