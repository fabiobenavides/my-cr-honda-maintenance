import { describe, expect, it } from '@jest/globals';
import { FACO_HONDA_PLAN, tasksForService } from '../data/faco-honda';
import type { ServiceRecord } from '../types';
import {
  INTERVAL_A_KM,
  INTERVAL_B_KM,
  INTERVAL_RADIATOR_KM,
  estimateDate,
  nextServiceKm,
  pendingTaskCountForRecord,
  pendingTasksFromHistory,
  serviceAtKm,
  upcomingServices,
} from './schedule';

describe('serviceAtKm', () => {
  it('devuelve A en intervalos de 5.000 km que no coinciden con B', () => {
    expect(serviceAtKm(5_000)).toEqual({ code: 'A', includesRadiator: false });
    expect(serviceAtKm(10_000)).toEqual({ code: 'A', includesRadiator: false });
    expect(serviceAtKm(15_000)).toEqual({ code: 'A', includesRadiator: false });
    expect(serviceAtKm(25_000)).toEqual({ code: 'A', includesRadiator: false });
  });

  it('devuelve B en vez de A cuando coinciden (cada 20.000 km)', () => {
    for (const km of [20_000, 40_000, 60_000, 100_000]) {
      const result = serviceAtKm(km);
      expect(result).not.toBeNull();
      expect(result!.code).toBe('B');
      expect(result!.code).not.toBe('A');
    }
  });

  it('incluye líquido de radiador en la B de 80.000 km y múltiplos', () => {
    expect(serviceAtKm(80_000)).toEqual({ code: 'B', includesRadiator: true });
    expect(serviceAtKm(160_000)).toEqual({ code: 'B', includesRadiator: true });
    expect(serviceAtKm(240_000)).toEqual({ code: 'B', includesRadiator: true });
  });

  it('no incluye radiador en otras revisiones B ni en las A', () => {
    expect(serviceAtKm(20_000)?.includesRadiator).toBe(false);
    expect(serviceAtKm(40_000)?.includesRadiator).toBe(false);
    expect(serviceAtKm(60_000)?.includesRadiator).toBe(false);
    expect(serviceAtKm(100_000)?.includesRadiator).toBe(false);
    expect(serviceAtKm(5_000)?.includesRadiator).toBe(false);
  });

  it('devuelve null fuera de un intervalo y en 0 o valores inválidos', () => {
    expect(serviceAtKm(0)).toBeNull();
    expect(serviceAtKm(-5_000)).toBeNull();
    expect(serviceAtKm(7_500)).toBeNull();
    expect(serviceAtKm(19_999)).toBeNull();
  });

  it('respeta el plan recibido (ciclo y reglas)', () => {
    expect(serviceAtKm(20_000, FACO_HONDA_PLAN)?.code).toBe('B');
    expect(FACO_HONDA_PLAN.intervalKm).toBe(INTERVAL_A_KM);
    expect(FACO_HONDA_PLAN.rules.bReplacesA).toBe(true);
    expect(FACO_HONDA_PLAN.rules.radiatorFluidEveryKm).toBe(INTERVAL_RADIATOR_KM);
    expect(
      FACO_HONDA_PLAN.serviceTypes.find((service) => service.code === 'B')?.intervalKm,
    ).toBe(INTERVAL_B_KM);
  });
});

describe('nextServiceKm', () => {
  it('es 5.000 km cuando el carro está en 0', () => {
    expect(nextServiceKm(0)).toBe(5_000);
  });

  it('está vencida si el kilometraje cae exactamente en el intervalo y no está completada', () => {
    expect(nextServiceKm(10_000)).toBe(10_000);
    expect(nextServiceKm(20_000)).toBe(20_000);
  });

  it('salta al siguiente intervalo si el actual ya se registró', () => {
    expect(nextServiceKm(10_000, [10_000])).toBe(15_000);
    expect(nextServiceKm(20_000, [20_000])).toBe(25_000);
  });

  it('avanza al próximo múltiplo cuando el km está entre intervalos', () => {
    expect(nextServiceKm(1_234)).toBe(5_000);
    expect(nextServiceKm(10_001)).toBe(15_000);
  });
});

describe('estimateDate', () => {
  const from = new Date('2026-11-12T12:00:00-06:00');
  const msPerMonth = (365.25 / 12) * 24 * 60 * 60 * 1000;

  it('devuelve la fecha de referencia si el servicio ya está vencido', () => {
    expect(estimateDate(10_000, 10_000, 1_000, from)?.getTime()).toBe(from.getTime());
    expect(estimateDate(12_000, 10_000, 1_000, from)?.getTime()).toBe(from.getTime());
  });

  it('suma los meses proporcionales al kilometraje que falta', () => {
    const expected = new Date(from.getTime() + 2 * msPerMonth);
    expect(estimateDate(8_000, 10_000, 1_000, from)?.getTime()).toBe(expected.getTime());
  });

  it('estima un año cuando faltan 12.000 km a 1.000 km por mes', () => {
    const expected = new Date(from.getTime() + 12 * msPerMonth);
    expect(estimateDate(8_000, 20_000, 1_000, from)?.getTime()).toBe(expected.getTime());
  });

  it('devuelve null si no hay promedio mensual válido', () => {
    expect(estimateDate(8_000, 10_000, 0, from)).toBeNull();
    expect(estimateDate(8_000, 10_000, -100, from)).toBeNull();
  });
});

describe('upcomingServices', () => {
  const from = new Date('2026-11-12T12:00:00-06:00');

  it('destaca el siguiente servicio y alterna A y B según el plan', () => {
    const list = upcomingServices(0, { count: 5, kmPerMonth: 1_000, from });
    expect(list.map((item) => ({ km: item.km, code: item.code, isNext: item.isNext }))).toEqual([
      { km: 5_000, code: 'A', isNext: true },
      { km: 10_000, code: 'A', isNext: false },
      { km: 15_000, code: 'A', isNext: false },
      { km: 20_000, code: 'B', isNext: false },
      { km: 25_000, code: 'A', isNext: false },
    ]);
    expect(list[0].estimatedDate?.getTime()).toBe(
      estimateDate(0, 5_000, 1_000, from)?.getTime(),
    );
  });

  it('incluye el radiador en la B de 80.000 km dentro de la lista', () => {
    const list = upcomingServices(70_000, { count: 4 });
    const at80 = list.find((item) => item.km === 80_000);
    expect(at80).toMatchObject({ code: 'B', includesRadiator: true });
    const at75 = list.find((item) => item.km === 75_000);
    expect(at75).toMatchObject({ code: 'A', includesRadiator: false });
  });

  it('omite kilometrajes ya registrados en el historial', () => {
    const list = upcomingServices(9_000, { count: 3, completedKms: [10_000] });
    expect(list.map((item) => item.km)).toEqual([15_000, 20_000, 25_000]);
    expect(list[0].isNext).toBe(true);
  });
});

describe('pendingTasksFromHistory', () => {
  const allAIds = tasksForService(FACO_HONDA_PLAN, 'A', 10_000).map((task) => task.id);

  function record(partial: Partial<ServiceRecord> & Pick<ServiceRecord, 'id' | 'km'>): ServiceRecord {
    return {
      date: '2026-11-01',
      workshop: 'FACO',
      cost: 0,
      serviceCode: 'A',
      ...partial,
    };
  }

  it('trata registros sin completedTaskIds como completos (legado)', () => {
    const history = [record({ id: '1', km: 10_000 })];
    expect(pendingTasksFromHistory(history)).toEqual([]);
    expect(pendingTaskCountForRecord(history[0])).toBe(0);
  });

  it('devuelve solo las tareas omitidas en un registro parcial', () => {
    const skippedId = allAIds[0];
    const completed = allAIds.filter((id) => id !== skippedId);
    const history = [record({ id: '1', km: 10_000, completedTaskIds: completed })];
    const pending = pendingTasksFromHistory(history);
    expect(pending).toHaveLength(1);
    expect(pending[0]).toMatchObject({
      recordId: '1',
      km: 10_000,
      serviceCode: 'A',
      task: { id: skippedId },
    });
    expect(pendingTaskCountForRecord(history[0])).toBe(1);
  });

  it('no deja pendientes si completedTaskIds cubre todas las tareas', () => {
    const history = [record({ id: '1', km: 10_000, completedTaskIds: allAIds })];
    expect(pendingTasksFromHistory(history)).toEqual([]);
  });
});
