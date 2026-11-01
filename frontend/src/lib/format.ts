export function fmtDate(value?: string | null): string {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return date.toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' });
}

export function fmtDateOnly(value?: string | null): string {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return date.toLocaleDateString(undefined, { dateStyle: 'medium' });
}

export function fmtMoney(value?: string | number | null): string {
  const amount = Number(value ?? 0);
  return `ZMW ${Number.isFinite(amount) ? amount.toFixed(2) : '0.00'}`;
}

export function fmtDuration(minutes?: number | null): string {
  if (!minutes || minutes <= 0) return '—';
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  if (hours === 0) return `${mins}m`;
  return `${hours}h ${mins.toString().padStart(2, '0')}m`;
}

export function toDateTimeLocal(value?: string | null): string {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  const offset = date.getTimezoneOffset();
  const local = new Date(date.getTime() - offset * 60_000);
  return local.toISOString().slice(0, 16);
}

export function fromDateTimeLocal(value: string): string {
  return new Date(value).toISOString();
}

export function cx(...values: Array<string | false | null | undefined>): string {
  return values.filter(Boolean).join(' ');
}

export type Tone = 'success' | 'warning' | 'danger' | 'info' | 'neutral' | 'primary';

export function statusTone(status?: string | null): Tone {
  switch (status) {
    case 'CONFIRMED':
    case 'APPROVED':
    case 'BOARDED':
    case 'OPERATIONAL':
    case 'COMPLETED':
    case 'VALID':
      return 'success';
    case 'PENDING':
    case 'SCHEDULED':
    case 'NOT_BOARDED':
    case 'MAINTENANCE':
    case 'BOARDING':
    case 'IN_TRANSIT':
    case 'UNPAID':
      return 'warning';
    case 'CANCELLED':
    case 'REJECTED':
    case 'REFUNDED':
    case 'OUT_OF_SERVICE':
    case 'INVALID_ROUTE':
    case 'WRONG_DATE':
    case 'DUPLICATE':
    case 'NOT_FOUND':
      return 'danger';
    case 'DROPPED_OFF':
      return 'info';
    default:
      return 'neutral';
  }
}

export function label(value?: string | null): string {
  if (!value) return '—';
  return value
    .toLowerCase()
    .split('_')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

export function splitList(value: string): string[] {
  return value
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
}
