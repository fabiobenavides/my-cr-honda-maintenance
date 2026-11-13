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
}

export function vehicleLabel(vehicle: Vehicle): string {
  const model = vehicle.model === 'Otros' ? vehicle.modelOther?.trim() || 'Otros' : vehicle.model;
  return `${vehicle.brand} ${model} ${vehicle.year}`;
}
