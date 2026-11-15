/**
 * Datos del programa de mantenimiento del manual del propietario Honda CR-V 2021
 * (versión en español, sección "Programa de mantenimiento", pp. 667–677, tabla
 * "Excepto modelos de Bielorrusia, Brasil, Kazajistán, México, Rusia, Ucrania y GCC").
 *
 * Solo se usan valores verificados en el manual. No cambian el plan de FACO:
 * se muestran como referencia al lado de cada tarea y como recordatorios extra.
 * Motor de referencia: 2,4 L sin turbo.
 */
import type { VehicleModelInfo } from './faco-honda';

export const HONDA_MANUAL_SOURCE = {
  title: 'Manual del propietario Honda CR-V 2021',
  section: 'Programa de mantenimiento, pp. 667–677',
  url: 'https://www.hondauniversidad.mx/static/agency-go-virtual/Honda/Manuales-Honda/CR-V/MANUAL_CR-V_2021.pdf',
  /** Generación del CR-V que comparte este programa (2017–2022). */
  appliesTo: { model: 'CR-V', fromYear: 2017, toYear: 2022 },
} as const;

/** true si el manual de referencia corresponde al carro registrado. */
export function manualAppliesTo(vehicle?: VehicleModelInfo | null): boolean {
  if (!vehicle) return false;
  const { model, fromYear, toYear } = HONDA_MANUAL_SOURCE.appliesTo;
  return (
    vehicle.model.trim().toLowerCase() === model.toLowerCase() &&
    vehicle.year >= fromYear &&
    vehicle.year <= toYear
  );
}

/**
 * Intervalo que propone el manual para cada tarea de FACO (por id de tarea).
 * Las tareas sin entrada no tienen un intervalo en el manual.
 */
export const HONDA_INTERVALS: Record<string, string> = {
  'a-aceite-motor': 'normal 10.000 km o 1 año / riguroso 5.000 km o 6 meses',
  'b-aceite-motor': 'normal 10.000 km o 1 año / riguroso 5.000 km o 6 meses',
  'a-filtro-aceite': 'normal 20.000 km o 2 años / riguroso 10.000 km o 1 año',
  'b-filtro-aire': 'cada 30.000 km',
  'b-bujias': 'cada 100.000 km',
  'b-aceite-transmision': 'cada 40.000 km o 2 años',
  'b-aceite-diferencial': 'a los 20.000, 100.000 y 180.000 km',
  'b-liquido-frenos': 'cada 3 años',
  'b-frenos-general': 'inspección cada 10.000 km o 6 meses',
  'b-liquido-radiador': '200.000 km o 10 años, luego cada 100.000 km o 5 años',
  'b-filtro-ac': 'cada 20.000 km o 1 año',
  'a-rotacion-balanceo': 'rotación cada 10.000 km',
  'b-rotacion-balanceo': 'rotación cada 10.000 km',
  'a-diag-suspension': 'inspección cada 10.000 km o 6 meses',
  'b-diag-suspension': 'inspección cada 10.000 km o 6 meses',
};

/** Notas para tareas donde FACO cambia la pieza mucho antes que el manual. */
export const HONDA_TASK_NOTES: Record<string, string> = {
  'b-bujias':
    'Según el manual de Honda, las bujías de iridio se cambian cada 100.000 km. ' +
    'Podés consultar en la agencia si el cambio es necesario en esta revisión.',
  'b-liquido-radiador':
    'Según el manual de Honda, el refrigerante se cambia por primera vez a los 200.000 km o 10 años, ' +
    'y luego cada 100.000 km o 5 años. Podés consultar en la agencia si el cambio es necesario en esta revisión.',
};

export function hondaIntervalFor(taskId: string, vehicle?: VehicleModelInfo | null): string | null {
  if (!manualAppliesTo(vehicle)) return null;
  return HONDA_INTERVALS[taskId] ?? null;
}

export function hondaNoteFor(taskId: string, vehicle?: VehicleModelInfo | null): string | null {
  if (!manualAppliesTo(vehicle)) return null;
  return HONDA_TASK_NOTES[taskId] ?? null;
}

/** Elementos que el manual pide y que el plan de FACO no incluye. */
export interface HondaExtraItem {
  id: string;
  name: string;
  /** Se recomienda en cada múltiplo de este kilometraje. */
  everyKm: number;
  note?: string;
}

export const HONDA_EXTRA_ITEMS: HondaExtraItem[] = [
  {
    id: 'honda-correa-accesorios',
    name: 'Revisar la correa de accesorios',
    everyKm: 40_000,
  },
  {
    id: 'honda-filtro-combustible',
    name: 'Cambiar el filtro de combustible (uso riguroso)',
    everyKm: 110_000,
    note: 'Recomendado si el combustible puede venir contaminado con polvo.',
  },
  {
    id: 'honda-juego-valvulas',
    name: 'Revisar el juego de válvulas',
    everyKm: 120_000,
    note: 'Se ajustan si hacen ruido.',
  },
];

export const HONDA_EXTRA_LABEL = 'Recomendado por el manual de Honda';

/** Extras del manual que caen en un kilometraje exacto. Vacío si el manual no aplica al carro. */
export function hondaExtrasAtKm(km: number, vehicle?: VehicleModelInfo | null): HondaExtraItem[] {
  if (!manualAppliesTo(vehicle) || !Number.isFinite(km) || km <= 0) return [];
  return HONDA_EXTRA_ITEMS.filter((item) => km % item.everyKm === 0);
}

/**
 * Límites por tiempo (lo que ocurra primero entre km y fecha).
 * Valen para cualquier Honda: el líquido de frenos cada 3 años y, con el
 * programa riguroso que usa FACO, el aceite cada 6 meses.
 */
export interface TimeRule {
  id: 'aceite-motor' | 'liquido-frenos';
  name: string;
  everyMonths: number;
  /** Tareas de FACO que, al hacerse, reinician el conteo. */
  taskIds: string[];
  /** Explicación corta con la fuente. */
  source: string;
}

export const TIME_RULES: TimeRule[] = [
  {
    id: 'aceite-motor',
    name: 'Cambio de aceite de motor',
    everyMonths: 6,
    taskIds: ['a-aceite-motor', 'b-aceite-motor'],
    source: 'Manual de Honda, programa riguroso: cada 5.000 km o 6 meses, lo que ocurra primero.',
  },
  {
    id: 'liquido-frenos',
    name: 'Cambio de líquido de frenos',
    everyMonths: 36,
    taskIds: ['b-liquido-frenos'],
    source: 'Manual de Honda: cada 3 años, sin importar el kilometraje.',
  },
];
