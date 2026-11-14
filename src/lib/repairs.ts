import type { RepairRecord, ServiceRecord } from '../types';
import { parseFlexibleDate } from './format';
import { MAX_SERVICE_PHOTOS, optionalPhotoUris } from './photos';

export const MAX_REPAIR_PHOTOS = MAX_SERVICE_PHOTOS;

export type RepairFormInput = {
  date: string;
  description: string;
  cost: string;
  workshop?: string;
  km?: string;
  photoUris?: string[];
};

export type RepairFormErrors = Partial<Record<'date' | 'description' | 'cost' | 'km', string>>;

function parseNumber(value: string): number {
  return Number(String(value).replace(/[,\s]/g, ''));
}

/**
 * Valida el formulario de arreglo y arma el registro. Fecha, descripción y
 * monto son obligatorios (igual que el costo de un servicio: 0 si no se sabe).
 * Taller, kilometraje y fotos son opcionales.
 */
export function buildRepairRecord(
  input: RepairFormInput,
  id: string = `${Date.now()}`,
): { record: RepairRecord | null; errors: RepairFormErrors } {
  const errors: RepairFormErrors = {};

  const isoDate = parseFlexibleDate(input.date);
  if (!isoDate) errors.date = 'Usá el formato DD/MM/AAAA.';

  const description = input.description.trim();
  if (!description) errors.description = 'Contá qué se le hizo al carro.';

  const parsedCost = parseNumber(input.cost);
  if (input.cost.trim() === '' || !Number.isFinite(parsedCost) || parsedCost < 0) {
    errors.cost = 'Ingresá el monto en colones (0 si no lo tenés).';
  }

  let km: number | undefined;
  const rawKm = (input.km ?? '').trim();
  if (rawKm !== '') {
    const parsedKm = parseNumber(rawKm);
    if (!Number.isFinite(parsedKm) || parsedKm < 0) {
      errors.km = 'Ingresá un kilometraje válido o dejalo vacío.';
    } else {
      km = Math.round(parsedKm);
    }
  }

  if (Object.keys(errors).length > 0) {
    return { record: null, errors };
  }

  const workshop = input.workshop?.trim();
  const record: RepairRecord = {
    id,
    date: isoDate!,
    description,
    cost: parsedCost,
  };
  if (workshop) record.workshop = workshop;
  if (km != null) record.km = km;
  const photos = optionalPhotoUris(input.photoUris, MAX_REPAIR_PHOTOS);
  if (photos) record.photoUris = photos;
  return { record, errors };
}

export type TimelineEntry =
  | { kind: 'service'; record: ServiceRecord }
  | { kind: 'repair'; record: RepairRecord };

/** Historial combinado: servicios y arreglos, del más reciente al más viejo. */
export function buildTimeline(history: ServiceRecord[], repairs: RepairRecord[]): TimelineEntry[] {
  const entries: TimelineEntry[] = [
    ...history.map((record) => ({ kind: 'service' as const, record })),
    ...repairs.map((record) => ({ kind: 'repair' as const, record })),
  ];
  return entries.sort((a, b) => {
    const byDate = b.record.date.localeCompare(a.record.date);
    if (byDate !== 0) return byDate;
    const byKm = (b.record.km ?? -1) - (a.record.km ?? -1);
    if (byKm !== 0) return byKm;
    return b.record.id.localeCompare(a.record.id);
  });
}

export function sortRepairs(repairs: RepairRecord[]): RepairRecord[] {
  return [...repairs].sort((a, b) => b.date.localeCompare(a.date) || b.id.localeCompare(a.id));
}

/** Total gastado en servicios y arreglos, en colones. */
export function totalSpent(history: ServiceRecord[], repairs: RepairRecord[]): number {
  const sum = (items: { cost: number }[]) =>
    items.reduce((acc, item) => acc + (Number.isFinite(item.cost) ? item.cost : 0), 0);
  return sum(history) + sum(repairs);
}

/**
 * Igual que con los servicios: si el arreglo trae un kilometraje mayor al
 * actual del carro, ese es el nuevo kilometraje. Si no trae, no se toca.
 */
export function nextCurrentKm(currentKm: number, repair: Pick<RepairRecord, 'km'>): number | null {
  return repair.km != null && repair.km > currentKm ? repair.km : null;
}
