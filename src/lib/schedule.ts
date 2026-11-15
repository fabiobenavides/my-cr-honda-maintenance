import {
  FACO_HONDA_PLAN,
  tasksForService,
  type MaintenancePlan,
  type MaintenanceTask,
  type VehicleModelInfo,
} from '../data/faco-honda';
import { TIME_RULES, type TimeRule } from '../data/honda-manual';
import type { ServiceRecord, Vehicle } from '../types';
import { parseIsoDate } from './format';

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
  /**
   * Fecha límite por tiempo (aceite cada 6 meses, líquido de frenos cada 3 años)
   * cuando llega antes que la fecha estimada por kilometraje.
   */
  timeDueDate?: Date | null;
  /** Reglas de tiempo que adelantan esta revisión. */
  timeRuleIds?: TimeRule['id'][];
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
  vehicle?: VehicleModelInfo | null,
): MaintenanceTask[] {
  if (record.completedTaskIds == null) {
    return [];
  }
  const expected = tasksForService(plan, record.serviceCode, record.km, vehicle);
  const done = new Set(record.completedTaskIds);
  return expected.filter((task) => !done.has(task.id));
}

/**
 * Pendientes de todo el historial, ordenados por km descendente y luego por nombre.
 */
export function pendingTasksFromHistory(
  history: ServiceRecord[],
  plan: MaintenancePlan = FACO_HONDA_PLAN,
  vehicle?: VehicleModelInfo | null,
): PendingTaskItem[] {
  const items: PendingTaskItem[] = [];
  for (const record of history) {
    for (const task of pendingTasksForRecord(record, plan, vehicle)) {
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
  vehicle?: VehicleModelInfo | null,
): number {
  return pendingTasksForRecord(record, plan, vehicle).length;
}

/* ------------------------------------------------------------------------ */
/* Límites por tiempo (lo que ocurra primero: km o fecha)                    */
/* ------------------------------------------------------------------------ */

const MS_PER_DAY = 24 * 60 * 60 * 1000;
/** Días antes del vencimiento en que un recordatorio pasa a "pronto". */
export const SOON_DAYS = 30;

/** Suma meses calendario; si el día no existe (31 → feb), usa el último día del mes. */
export function addMonths(date: Date, months: number): Date {
  const result = new Date(date.getTime());
  const day = result.getDate();
  result.setDate(1);
  result.setMonth(result.getMonth() + months);
  const lastDay = new Date(result.getFullYear(), result.getMonth() + 1, 0).getDate();
  result.setDate(Math.min(day, lastDay));
  return result;
}

/** true si el registro incluye (y marcó como hecha) alguna de las tareas. */
export function recordIncludesTask(
  record: ServiceRecord,
  taskIds: string[],
  plan: MaintenancePlan = FACO_HONDA_PLAN,
  vehicle?: VehicleModelInfo | null,
): boolean {
  const expected = tasksForService(plan, record.serviceCode, record.km, vehicle).map((t) => t.id);
  const relevant = taskIds.filter((id) => expected.includes(id));
  if (relevant.length === 0) return false;
  if (record.completedTaskIds == null) return true;
  return relevant.some((id) => record.completedTaskIds!.includes(id));
}

/** Fecha del último servicio que hizo alguna de las tareas, o null. */
export function lastDoneDate(
  history: ServiceRecord[],
  taskIds: string[],
  plan: MaintenancePlan = FACO_HONDA_PLAN,
  vehicle?: VehicleModelInfo | null,
): Date | null {
  let latest: Date | null = null;
  for (const record of history) {
    if (!recordIncludesTask(record, taskIds, plan, vehicle)) continue;
    const date = parseIsoDate(record.date);
    if (date && (!latest || date.getTime() > latest.getTime())) {
      latest = date;
    }
  }
  return latest;
}

/** Fecha desde la que se cuenta si no hay servicios: registro del carro en la app. */
export function vehicleBaseDate(vehicle: Pick<Vehicle, 'registeredAt' | 'updatedAt'>): Date | null {
  for (const value of [vehicle.registeredAt, vehicle.updatedAt]) {
    if (!value) continue;
    const date = parseIsoDate(value.slice(0, 10)) ?? new Date(value);
    if (!Number.isNaN(date.getTime())) return date;
  }
  return null;
}

export type TimeReminderStatus = 'vencido' | 'pronto' | 'al-dia';

export type TimeReminder = {
  rule: TimeRule;
  /** Último servicio que hizo la tarea; null si no hay. */
  lastDoneDate: Date | null;
  /** Desde dónde se cuenta (último servicio o registro del carro). */
  baseDate: Date;
  /** Vencimiento por tiempo. */
  dueDate: Date;
  /** Fecha estimada de la próxima revisión que incluye la tarea (por km). */
  kmDueDate: Date | null;
  /** Kilometraje de esa revisión. */
  kmDueKm: number | null;
  /** Qué llega primero. */
  dueBy: 'tiempo' | 'km';
  status: TimeReminderStatus;
  /** Días que faltan (negativo si ya venció). */
  daysLeft: number;
};

function upcomingIncludesRule(
  service: UpcomingService,
  rule: TimeRule,
  plan: MaintenancePlan,
  vehicle?: VehicleModelInfo | null,
): boolean {
  const ids = tasksForService(plan, service.code, service.km, vehicle).map((task) => task.id);
  return rule.taskIds.some((id) => ids.includes(id));
}

/**
 * Recordatorios por tiempo: cada regla vence a los N meses del último servicio
 * que hizo la tarea (o del registro del carro si no hay ninguno). Se compara
 * con la fecha estimada por km de la próxima revisión que la incluye.
 */
export function timeReminders(
  vehicle: Vehicle,
  history: ServiceRecord[],
  options: {
    upcoming?: UpcomingService[];
    plan?: MaintenancePlan;
    now?: Date;
    rules?: TimeRule[];
  } = {},
): TimeReminder[] {
  const plan = options.plan ?? FACO_HONDA_PLAN;
  const now = options.now ?? new Date();
  const rules = options.rules ?? TIME_RULES;
  const upcoming = options.upcoming ?? [];
  const fallback = vehicleBaseDate(vehicle) ?? now;

  return rules.map((rule) => {
    const last = lastDoneDate(history, rule.taskIds, plan, vehicle);
    const baseDate = last ?? fallback;
    const dueDate = addMonths(baseDate, rule.everyMonths);
    const kmService = upcoming.find((service) => upcomingIncludesRule(service, rule, plan, vehicle));
    const kmDueDate = kmService?.estimatedDate ?? null;
    const dueBy: 'tiempo' | 'km' =
      kmDueDate && kmDueDate.getTime() <= dueDate.getTime() ? 'km' : 'tiempo';
    const daysLeft = Math.ceil((dueDate.getTime() - now.getTime()) / MS_PER_DAY);
    const status: TimeReminderStatus =
      daysLeft <= 0 ? 'vencido' : daysLeft <= SOON_DAYS ? 'pronto' : 'al-dia';
    return {
      rule,
      lastDoneDate: last,
      baseDate,
      dueDate,
      kmDueDate,
      kmDueKm: kmService?.km ?? null,
      dueBy,
      status,
      daysLeft,
    };
  });
}

/**
 * Marca en cada revisión próxima la fecha límite por tiempo cuando llega antes
 * que la estimada por km. Cada regla se aplica solo a la primera revisión que
 * incluye su tarea.
 */
export function applyTimeLimits(
  upcoming: UpcomingService[],
  reminders: TimeReminder[],
  plan: MaintenancePlan = FACO_HONDA_PLAN,
  vehicle?: VehicleModelInfo | null,
): UpcomingService[] {
  const result = upcoming.map((service) => ({ ...service }));
  for (const reminder of reminders) {
    if (reminder.dueBy !== 'tiempo') continue;
    const target = result.find((service) => upcomingIncludesRule(service, reminder.rule, plan, vehicle));
    if (!target) continue;
    if (target.estimatedDate && target.estimatedDate.getTime() <= reminder.dueDate.getTime()) continue;
    if (!target.timeDueDate || reminder.dueDate.getTime() < target.timeDueDate.getTime()) {
      target.timeDueDate = reminder.dueDate;
    }
    target.timeRuleIds = [...(target.timeRuleIds ?? []), reminder.rule.id];
  }
  return result;
}

/** Fecha en que realmente toca la revisión: la primera entre km y tiempo. */
export function effectiveDueDate(service: UpcomingService): Date | null {
  const candidates = [service.estimatedDate, service.timeDueDate].filter(
    (date): date is Date => date instanceof Date && !Number.isNaN(date.getTime()),
  );
  if (candidates.length === 0) return null;
  return candidates.reduce((min, date) => (date.getTime() < min.getTime() ? date : min));
}
