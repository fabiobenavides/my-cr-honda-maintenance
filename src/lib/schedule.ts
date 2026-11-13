import {
  FACO_HONDA_PLAN,
  tasksForService,
  type MaintenancePlan,
  type MaintenanceTask,
} from '../data/faco-honda';
import type { ServiceRecord } from '../types';

export const INTERVAL_A_KM = 5_000;
export const INTERVAL_B_KM = 20_000;
export const INTERVAL_RADIATOR_KM = 80_000;

export type ServiceAtKm = {
  code: string;
  includesRadiator: boolean;
};

export type UpcomingService = {
  km: number;
  code: string;
  includesRadiator: boolean;
  estimatedDate: Date | null;
  isNext: boolean;
};

/**
 * Devuelve el tipo de revisión que corresponde a un kilometraje exacto,
 * o null si no cae en un intervalo del plan.
 *
 * Reglas FACO: A cada 5.000 km; B cada 20.000 km (reemplaza a la A);
 * el líquido de radiador se suma a la B cada 80.000 km.
 */
export function serviceAtKm(
  km: number,
  plan: MaintenancePlan = FACO_HONDA_PLAN,
): ServiceAtKm | null {
  if (!Number.isFinite(km) || km <= 0 || km % plan.intervalKm !== 0) {
    return null;
  }

  const typeB = plan.serviceTypes.find((service) => service.code === 'B');
  const intervalB = typeB?.intervalKm ?? INTERVAL_B_KM;
  const radiatorEvery = plan.rules.radiatorFluidEveryKm ?? INTERVAL_RADIATOR_KM;

  if (plan.rules.bReplacesA && km % intervalB === 0) {
    return {
      code: 'B',
      includesRadiator: radiatorEvery > 0 && km % radiatorEvery === 0,
    };
  }

  const typeA = plan.serviceTypes.find((service) => service.code === 'A');
  if (typeA && km % typeA.intervalKm === 0) {
    return { code: 'A', includesRadiator: false };
  }

  return null;
}

/**
 * Primer intervalo (múltiplo del ciclo base) que aún no se ha completado
 * y es mayor o igual al kilometraje actual (si está justo en el intervalo).
 */
export function nextServiceKm(
  currentKm: number,
  completedKms: number[] = [],
  intervalKm = INTERVAL_A_KM,
): number {
  const completed = new Set(completedKms);
  let km = Math.ceil(currentKm / intervalKm) * intervalKm;
  if (km < intervalKm) {
    km = intervalKm;
  }
  while (km < currentKm || completed.has(km)) {
    km += intervalKm;
  }
  return km;
}

/**
 * Estima la fecha del servicio a partir del kilometraje mensual promedio.
 * Usa meses de 365.25/12 días. Si el servicio ya está vencido, devuelve `from`.
 * Si no hay promedio mensual, devuelve null.
 */
export function estimateDate(
  currentKm: number,
  targetKm: number,
  kmPerMonth: number,
  from: Date = new Date(),
): Date | null {
  if (!Number.isFinite(kmPerMonth) || kmPerMonth <= 0) {
    return null;
  }
  if (targetKm <= currentKm) {
    return new Date(from.getTime());
  }
  const months = (targetKm - currentKm) / kmPerMonth;
  const msPerMonth = (365.25 / 12) * 24 * 60 * 60 * 1000;
  return new Date(from.getTime() + months * msPerMonth);
}

export function upcomingServices(
  currentKm: number,
  options: {
    count?: number;
    completedKms?: number[];
    kmPerMonth?: number;
    from?: Date;
    plan?: MaintenancePlan;
  } = {},
): UpcomingService[] {
  const plan = options.plan ?? FACO_HONDA_PLAN;
  const intervalKm = plan.intervalKm;
  const count = options.count ?? 12;
  const completed = new Set(options.completedKms ?? []);
  const results: UpcomingService[] = [];

  let km = nextServiceKm(currentKm, [], intervalKm);
  const safetyLimit = currentKm + intervalKm * (count + completed.size + 50);

  while (results.length < count && km <= safetyLimit) {
    if (!completed.has(km)) {
      const service = serviceAtKm(km, plan);
      if (service) {
        results.push({
          km,
          code: service.code,
          includesRadiator: service.includesRadiator,
          estimatedDate:
            options.kmPerMonth == null
              ? null
              : estimateDate(currentKm, km, options.kmPerMonth, options.from),
          isNext: results.length === 0,
        });
      }
    }
    km += intervalKm;
  }

  return results;
}

export type PendingTaskItem = {
  recordId: string;
  km: number;
  serviceCode: string;
  task: MaintenanceTask;
};

/**
 * Tareas del plan que no quedaron marcadas como hechas en un registro.
 * Si `completedTaskIds` está ausente, el registro se trata como completo (legado).
 */
export function pendingTasksForRecord(
  record: ServiceRecord,
  plan: MaintenancePlan = FACO_HONDA_PLAN,
): MaintenanceTask[] {
  if (record.completedTaskIds == null) {
    return [];
  }
  const expected = tasksForService(plan, record.serviceCode, record.km);
  const done = new Set(record.completedTaskIds);
  return expected.filter((task) => !done.has(task.id));
}

/**
 * Pendientes de todo el historial, ordenados por km descendente y luego por nombre.
 */
export function pendingTasksFromHistory(
  history: ServiceRecord[],
  plan: MaintenancePlan = FACO_HONDA_PLAN,
): PendingTaskItem[] {
  const items: PendingTaskItem[] = [];
  for (const record of history) {
    for (const task of pendingTasksForRecord(record, plan)) {
      items.push({
        recordId: record.id,
        km: record.km,
        serviceCode: record.serviceCode,
        task,
      });
    }
  }
  return items.sort(
    (a, b) => b.km - a.km || a.task.name.localeCompare(b.task.name, 'es'),
  );
}

/** Cuántas tareas quedan pendientes en un registro (0 si es legado o está completo). */
export function pendingTaskCountForRecord(
  record: ServiceRecord,
  plan: MaintenancePlan = FACO_HONDA_PLAN,
): number {
  return pendingTasksForRecord(record, plan).length;
}
