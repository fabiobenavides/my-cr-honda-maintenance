export const HONDA_MODELS = [
  'Civic',
  'CR-V',
  'HR-V',
  'Pilot',
  'Accord',
  'City',
  'Otros',
] as const;

export type HondaModel = (typeof HONDA_MODELS)[number];

export interface Vehicle {
  brand: 'Honda';
  dealerId: 'faco';
  model: HondaModel;
  modelOther?: string;
  year: number;
  currentKm: number;
  avgKmPerMonth: number;
  updatedAt: string;
  /**
   * Cuándo se registró el carro en la app (ISO). Base para los recordatorios por
   * tiempo si todavía no hay servicios. Ausente en datos antiguos (se usa updatedAt).
   */
  registeredAt?: string;
  /** Número de placa, opcional. Ya normalizado (mayúsculas, sin espacios). */
  plate?: string;
  /** URIs locales de fotos opcionales del vehículo. */
  photoUris?: string[];
}

export interface ServiceRecord {
  id: string;
  date: string;
  km: number;
  workshop: string;
  cost: number;
  serviceCode: string;
  includesRadiator?: boolean;
  /** Ids de tareas hechas. Ausente = todas hechas (registros antiguos). */
  completedTaskIds?: string[];
  /** URIs locales de fotos opcionales del servicio (factura, escaneo, etc.). */
  photoUris?: string[];
}

/**
 * Arreglo independiente: algo que se le hizo al carro fuera del plan de la
 * agencia (una llanta, una batería, un golpe...). Se registra cuando pasa y
 * no afecta el cálculo de las revisiones por kilometraje.
 */
export interface RepairRecord {
  id: string;
  /** Fecha ISO (AAAA-MM-DD). */
  date: string;
  /** Qué se le hizo, en texto libre. */
  description: string;
  /** Monto en colones. */
  cost: number;
  /** Taller o lugar, opcional. */
  workshop?: string;
  /** Kilometraje al momento del arreglo, opcional. */
  km?: number;
  /** URIs locales de fotos opcionales (factura, el repuesto, el daño...). */
  photoUris?: string[];
}

export function vehicleLabel(vehicle: Vehicle): string {
  const model = vehicle.model === 'Otros' ? vehicle.modelOther?.trim() || 'Otros' : vehicle.model;
  return `${vehicle.brand} ${model} ${vehicle.year}`;
}
