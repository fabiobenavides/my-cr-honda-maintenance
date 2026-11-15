import { describe, expect, it } from '@jest/globals';
import { FACO_HONDA_PLAN } from './faco-honda';
import {
  HONDA_INTERVALS,
  HONDA_TASK_NOTES,
  TIME_RULES,
  hondaExtrasAtKm,
  hondaIntervalFor,
  hondaNoteFor,
  manualAppliesTo,
} from './honda-manual';

const CRV_2021 = { model: 'CR-V', year: 2021 };
const allTaskIds = new Set(FACO_HONDA_PLAN.serviceTypes.flatMap((s) => s.tasks.map((t) => t.id)));

describe('manual de Honda CR-V 2021', () => {
  it('aplica solo al CR-V de la misma generación (2017–2022)', () => {
    expect(manualAppliesTo(CRV_2021)).toBe(true);
    expect(manualAppliesTo({ model: 'CR-V', year: 2017 })).toBe(true);
    expect(manualAppliesTo({ model: 'CR-V', year: 2015 })).toBe(false);
    expect(manualAppliesTo({ model: 'Civic', year: 2021 })).toBe(false);
    expect(manualAppliesTo(null)).toBe(false);
  });

  it('todos los intervalos, notas y reglas apuntan a tareas que existen en el plan', () => {
    for (const id of [
      ...Object.keys(HONDA_INTERVALS),
      ...Object.keys(HONDA_TASK_NOTES),
      ...TIME_RULES.flatMap((rule) => rule.taskIds),
    ]) {
      expect(allTaskIds.has(id)).toBe(true);
    }
  });

  it('devuelve el intervalo de Honda para las tareas verificadas', () => {
    expect(hondaIntervalFor('b-bujias', CRV_2021)).toBe('cada 100.000 km');
    expect(hondaIntervalFor('b-liquido-frenos', CRV_2021)).toBe('cada 3 años');
    expect(hondaIntervalFor('b-liquido-radiador', CRV_2021)).toBe(
      '200.000 km o 10 años, luego cada 100.000 km o 5 años',
    );
    expect(hondaIntervalFor('a-aceite-motor', CRV_2021)).toBe(
      'normal 10.000 km o 1 año / riguroso 5.000 km o 6 meses',
    );
    expect(hondaIntervalFor('b-aceite-transmision', CRV_2021)).toBe('cada 40.000 km o 2 años');
    expect(hondaIntervalFor('b-filtro-ac', CRV_2021)).toBe('cada 20.000 km o 1 año');
  });

  it('omite el intervalo cuando Honda no da uno o el manual no aplica al carro', () => {
    expect(hondaIntervalFor('a-luces', CRV_2021)).toBeNull();
    expect(hondaIntervalFor('b-fibras-frenos', CRV_2021)).toBeNull();
    expect(hondaIntervalFor('b-bujias', { model: 'Civic', year: 2021 })).toBeNull();
  });

  it('muestra la nota del manual en bujías y refrigerante', () => {
    expect(hondaNoteFor('b-bujias', CRV_2021)).toMatch(/100\.000 km/);
    expect(hondaNoteFor('b-liquido-radiador', CRV_2021)).toMatch(/200\.000 km o 10 años/);
    expect(hondaNoteFor('b-bujias', CRV_2021)).toMatch(/consultar en la agencia/);
    expect(hondaNoteFor('b-aceite-motor', CRV_2021)).toBeNull();
  });

  it('agrega los extras del manual en su kilometraje', () => {
    const ids = (km: number) => hondaExtrasAtKm(km, CRV_2021).map((item) => item.id);
    expect(ids(40_000)).toEqual(['honda-correa-accesorios']);
    expect(ids(20_000)).toEqual([]);
    expect(ids(110_000)).toEqual(['honda-filtro-combustible']);
    expect(ids(120_000)).toEqual(['honda-correa-accesorios', 'honda-juego-valvulas']);
    expect(hondaExtrasAtKm(40_000, { model: 'Civic', year: 2021 })).toEqual([]);
  });
});
