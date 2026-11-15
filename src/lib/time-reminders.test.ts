import { describe, expect, it } from '@jest/globals';
import { FACO_HONDA_PLAN } from '../data/faco-honda';
import type { ServiceRecord, Vehicle } from '../types';
import {
  addMonths,
  applyTimeLimits,
  effectiveDueDate,
  lastDoneDate,
  pendingTasksFromHistory,
  timeReminders,
  upcomingServices,
  vehicleBaseDate,
} from './schedule';

const vehicle: Vehicle = {
  brand: 'Honda',
  dealerId: 'faco',
  model: 'CR-V',
  year: 2021,
  currentKm: 41_000,
  avgKmPerMonth: 1_000,
  updatedAt: '2026-11-01T12:00:00.000Z',
  registeredAt: '2026-01-10T12:00:00.000Z',
};

function record(partial: Partial<ServiceRecord> & Pick<ServiceRecord, 'km' | 'serviceCode' | 'date'>): ServiceRecord {
  return { id: `r-${partial.km}`, workshop: 'FACO', cost: 0, ...partial };
}

const d = (iso: string) => new Date(`${iso}T12:00:00`);
const ymd = (date: Date) => date.toISOString().slice(0, 10);

describe('addMonths', () => {
  it('suma meses calendario', () => {
    expect(ymd(addMonths(d('2026-01-15'), 6))).toBe('2026-07-15');
    expect(ymd(addMonths(d('2026-05-10'), 36))).toBe('2029-05-10');
  });

  it('usa el último día del mes si el día no existe', () => {
    expect(ymd(addMonths(d('2026-08-31'), 6))).toBe('2027-02-28');
  });
});

describe('lastDoneDate', () => {
  const history = [
    record({ km: 35_000, serviceCode: 'A', date: '2026-05-01' }),
    record({ km: 40_000, serviceCode: 'B', date: '2026-08-20' }),
  ];

  it('toma el servicio más reciente que incluye la tarea', () => {
    expect(ymd(lastDoneDate(history, ['a-aceite-motor', 'b-aceite-motor'])!)).toBe('2026-08-20');
    expect(ymd(lastDoneDate(history, ['b-liquido-frenos'])!)).toBe('2026-08-20');
  });

  it('ignora servicios donde la tarea quedó sin marcar', () => {
    const withSkip = [
      history[0],
      record({ km: 40_000, serviceCode: 'B', date: '2026-08-20', completedTaskIds: ['b-aceite-motor'] }),
    ];
    expect(lastDoneDate(withSkip, ['b-liquido-frenos'])).toBeNull();
    expect(ymd(lastDoneDate(withSkip, ['a-aceite-motor', 'b-aceite-motor'])!)).toBe('2026-08-20');
  });
});

describe('vehicleBaseDate', () => {
  it('usa registeredAt y si no existe, updatedAt', () => {
    expect(ymd(vehicleBaseDate(vehicle)!)).toBe('2026-01-10');
    expect(ymd(vehicleBaseDate({ updatedAt: '2025-03-04T00:00:00.000Z' })!)).toBe('2025-03-04');
  });
});

describe('timeReminders', () => {
  it('sin servicios cuenta desde el registro del carro', () => {
    const now = d('2026-11-14');
    const [oil, brakes] = timeReminders(vehicle, [], { now });
    expect(oil.rule.id).toBe('aceite-motor');
    expect(oil.lastDoneDate).toBeNull();
    expect(ymd(oil.dueDate)).toBe('2026-07-10');
    expect(oil.status).toBe('vencido');
    expect(brakes.rule.id).toBe('liquido-frenos');
    expect(ymd(brakes.dueDate)).toBe('2029-01-10');
    expect(brakes.status).toBe('al-dia');
  });

  it('el aceite vence por tiempo si se maneja poco (gana la fecha)', () => {
    const now = d('2026-11-14');
    const lowUse = { ...vehicle, currentKm: 40_100, avgKmPerMonth: 300 };
    const history = [record({ km: 40_000, serviceCode: 'B', date: '2026-10-01' })];
    const upcoming = upcomingServices(lowUse.currentKm, {
      completedKms: [40_000],
      kmPerMonth: lowUse.avgKmPerMonth,
      from: now,
    });
    // 4.900 km a 300 km/mes ≈ 16 meses; por tiempo son 6 meses.
    const [oil] = timeReminders(lowUse, history, { upcoming, now });
    expect(ymd(oil.dueDate)).toBe('2027-04-01');
    expect(oil.dueBy).toBe('tiempo');
    expect(oil.kmDueKm).toBe(45_000);
  });

  it('el aceite toca por km si se maneja mucho (gana el kilometraje)', () => {
    const now = d('2026-11-14');
    const history = [record({ km: 40_000, serviceCode: 'B', date: '2026-10-01' })];
    const upcoming = upcomingServices(41_000, { completedKms: [40_000], kmPerMonth: 2_000, from: now });
    const [oil] = timeReminders(vehicle, history, { upcoming, now });
    expect(oil.dueBy).toBe('km');
    expect(oil.kmDueKm).toBe(45_000);
  });

  it('el líquido de frenos se compara con la próxima Revisión B', () => {
    const now = d('2026-11-14');
    const history = [record({ km: 40_000, serviceCode: 'B', date: '2024-01-15' })];
    const upcoming = upcomingServices(41_000, { completedKms: [40_000], kmPerMonth: 300, from: now });
    const [, brakes] = timeReminders(vehicle, history, { upcoming, now });
    expect(ymd(brakes.dueDate)).toBe('2027-01-15');
    expect(brakes.kmDueKm).toBe(60_000);
    expect(brakes.dueBy).toBe('tiempo');
    expect(brakes.status).toBe('al-dia');
  });

  it('marca "pronto" cuando faltan 30 días o menos', () => {
    const history = [record({ km: 40_000, serviceCode: 'B', date: '2026-06-01' })];
    const [oil] = timeReminders(vehicle, history, { now: d('2026-11-14') });
    expect(ymd(oil.dueDate)).toBe('2026-12-01');
    expect(oil.status).toBe('pronto');
  });
});

describe('applyTimeLimits y effectiveDueDate', () => {
  const now = d('2026-11-14');
  const history = [record({ km: 40_000, serviceCode: 'B', date: '2024-01-15' })];
  const upcoming = upcomingServices(41_000, { completedKms: [40_000], kmPerMonth: 300, from: now });
  const reminders = timeReminders(vehicle, history, { upcoming, now });
  const applied = applyTimeLimits(upcoming, reminders, FACO_HONDA_PLAN, vehicle);

  it('adelanta la próxima revisión por el aceite y la próxima B por el líquido de frenos', () => {
    const next = applied[0];
    expect(next.km).toBe(45_000);
    expect(next.timeRuleIds).toEqual(['aceite-motor']);
    // Aceite: 6 meses desde 2024-01-15, ya vencido.
    expect(ymd(effectiveDueDate(next)!)).toBe('2024-07-15');

    const nextB = applied.find((service) => service.code === 'B')!;
    expect(nextB.km).toBe(60_000);
    expect(nextB.timeRuleIds).toEqual(['liquido-frenos']);
    expect(ymd(effectiveDueDate(nextB)!)).toBe('2027-01-15');
  });

  it('no cambia las demás revisiones ni la lista original', () => {
    expect(applied[1].timeDueDate).toBeUndefined();
    expect(upcoming[0].timeDueDate).toBeUndefined();
  });

  it('sin fechas devuelve null', () => {
    expect(effectiveDueDate({ ...upcoming[0], estimatedDate: null })).toBeNull();
  });
});

describe('pendientes con filtro por modelo', () => {
  it('no reporta el freno de mano como pendiente en un CR-V', () => {
    const history = [
      record({
        km: 5_000,
        serviceCode: 'A',
        date: '2026-02-01',
        completedTaskIds: FACO_HONDA_PLAN.serviceTypes[0].tasks
          .map((task) => task.id)
          .filter((id) => id !== 'a-freno-mano'),
      }),
    ];
    expect(pendingTasksFromHistory(history, FACO_HONDA_PLAN, vehicle)).toHaveLength(0);
    expect(pendingTasksFromHistory(history, FACO_HONDA_PLAN).map((p) => p.task.id)).toEqual(['a-freno-mano']);
  });
});
