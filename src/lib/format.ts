const DATE_FORMATTER = new Intl.DateTimeFormat('es-CR', {
  day: 'numeric',
  month: 'long',
  year: 'numeric',
  timeZone: 'America/Costa_Rica',
});

export function formatKm(km: number): string {
  return `${km.toLocaleString('es-CR')} km`;
}

export function formatDate(date: Date): string {
  return DATE_FORMATTER.format(date);
}

export function formatIsoDate(isoDate: string): string {
  const date = parseIsoDate(isoDate);
  return date ? formatDate(date) : isoDate;
}

export function formatColon(amount: number): string {
  return `₡${amount.toLocaleString('es-CR')}`;
}

export function parseIsoDate(value: string): Date | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return null;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const date = new Date(year, month - 1, day);
  if (date.getFullYear() !== year || date.getMonth() !== month - 1 || date.getDate() !== day) {
    return null;
  }
  return date;
}

export function toIsoDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/** Acepta DD/MM/AAAA o AAAA-MM-DD. */
export function parseFlexibleDate(value: string): string | null {
  const trimmed = value.trim();
  const iso = parseIsoDate(trimmed);
  if (iso) return toIsoDate(iso);
  const match = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(trimmed);
  if (!match) return null;
  const day = Number(match[1]);
  const month = Number(match[2]);
  const year = Number(match[3]);
  const date = new Date(year, month - 1, day);
  if (date.getFullYear() !== year || date.getMonth() !== month - 1 || date.getDate() !== day) {
    return null;
  }
  return toIsoDate(date);
}

export function isoToDisplay(isoDate: string): string {
  const date = parseIsoDate(isoDate);
  if (!date) return isoDate;
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  return `${day}/${month}/${date.getFullYear()}`;
}
