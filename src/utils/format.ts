export function formatVnd(amount: number): string {
  if (!Number.isFinite(amount)) return '0 ₫';
  return `${Math.round(amount).toLocaleString('vi-VN')} ₫`;
}

export function formatVndCompact(amount: number): string {
  if (!Number.isFinite(amount) || amount === 0) return '0';
  const abs = Math.abs(amount);
  if (abs >= 1_000_000_000) {
    return `${(amount / 1_000_000_000).toLocaleString('vi-VN', { maximumFractionDigits: 2 })} tỷ`;
  }
  if (abs >= 1_000_000) {
    return `${(amount / 1_000_000).toLocaleString('vi-VN', { maximumFractionDigits: 1 })} tr`;
  }
  if (abs >= 1_000) {
    return `${Math.round(amount / 1_000).toLocaleString('vi-VN')}k`;
  }
  return Math.round(amount).toLocaleString('vi-VN');
}

export function formatNumber(value: number, decimals = 0): string {
  if (!Number.isFinite(value)) return '0';
  return value.toLocaleString('vi-VN', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

export function parseDateToTimestamp(dateStr: string): number {
  if (!dateStr) return 0;
  const trimmed = dateStr.trim();
  // Match YYYY-MM-DD or YYYY-MM-DD HH:mm(:ss)
  const match = trimmed.match(
    /^(\d{4})-(\d{1,2})-(\d{1,2})(?:[ T](\d{1,2}):(\d{1,2})(?::(\d{1,2}))?)?/
  );
  if (match) {
    const year = Number(match[1]);
    const month = Number(match[2]) - 1;
    const day = Number(match[3]);
    const hour = match[4] ? Number(match[4]) : 12;
    const minute = match[5] ? Number(match[5]) : 0;
    const second = match[6] ? Number(match[6]) : 0;
    return new Date(year, month, day, hour, minute, second).getTime();
  }
  const parsed = Date.parse(trimmed);
  return Number.isNaN(parsed) ? 0 : parsed;
}

export function extractDateOnly(dateStr: string): string {
  if (!dateStr) return '';
  const match = dateStr.trim().match(/^(\d{4}-\d{2}-\d{2})/);
  return match ? match[1] : dateStr.slice(0, 10);
}

export function formatDateDisplay(dateStr: string, includeTime = false): string {
  if (!dateStr) return '—';
  const match = dateStr
    .trim()
    .match(/^(\d{4})-(\d{2})-(\d{2})(?:[ T](\d{2}):(\d{2}))?/);
  if (!match) return dateStr;
  const [, yyyy, mm, dd, hh, min] = match;
  if (includeTime && hh && min) {
    return `${dd}/${mm}/${yyyy} ${hh}:${min}`;
  }
  return `${dd}/${mm}/${yyyy}`;
}

export function toDatetimeLocalValue(date = new Date()): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(
    date.getHours()
  )}:${pad(date.getMinutes())}`;
}

export function fromDatetimeLocalValue(val: string): string {
  if (!val) return '';
  return val.replace('T', ' ');
}

export function toDateInputValue(date = new Date()): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

export function createId(prefix = 'id'): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return `${prefix}_${crypto.randomUUID()}`;
  }
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}
