import { describe, expect, it } from '@jest/globals';
import { FACO_HONDA_PLAN, appliesToVehicle, includedPartsForService, tasksForService } from './faco-honda';

const CRV_2021 = { model: 'CR-V', year: 2021 };
const CIVIC_2021 = { model: 'Civic', year: 2021 };

const ids = (items: { id: string }[]) => items.map((item) => item.id);

describe('filtro de tareas por modelo', () => {
  it('oculta el ajuste de freno de mano en la Revisión A del CR-V (freno eléctrico)', () => {
    expect(ids(tasksForService(FACO_HONDA_PLAN, 'A', 5_000, CRV_2021))).not.toContain('a-freno-mano');
  });

  it('oculta el líquido de dirección hidráulica (tarea y repuesto) en la Revisión B del CR-V', () => {
    expect(ids(tasksForService(FACO_HONDA_PLAN, 'B', 20_000, CRV_2021))).not.toContain(
      'b-direccion-hidraulica',
    );
    expect(ids(includedPartsForService(FACO_HONDA_PLAN, 'B', CRV_2021))).not.toContain('p-liquido-direccion');
  });

  it('mantiene ambas tareas en otros modelos y cuando no se indica carro', () => {
    expect(ids(tasksForService(FACO_HONDA_PLAN, 'A', 5_000, CIVIC_2021))).toContain('a-freno-mano');
    expect(ids(tasksForService(FACO_HONDA_PLAN, 'B', 20_000, CIVIC_2021))).toContain('b-direccion-hidraulica');
    expect(ids(tasksForService(FACO_HONDA_PLAN, 'A', 5_000))).toContain('a-freno-mano');
    expect(ids(includedPartsForService(FACO_HONDA_PLAN, 'B'))).toContain('p-liquido-direccion');
  });

  it('respeta el año: un CR-V 2015 (sin freno eléctrico) conserva el freno de mano', () => {
    expect(ids(tasksForService(FACO_HONDA_PLAN, 'A', 5_000, { model: 'CR-V', year: 2015 }))).toContain(
      'a-freno-mano',
    );
    expect(
      ids(tasksForService(FACO_HONDA_PLAN, 'B', 20_000, { model: 'CR-V', year: 2015 })),
    ).not.toContain('b-direccion-hidraulica');
  });

  it('compara el modelo sin importar mayúsculas ni espacios', () => {
    const task = { excludeFor: [{ model: 'CR-V', reason: 'x' }] };
    expect(appliesToVehicle(task, { model: ' cr-v ', year: 2021 })).toBe(false);
    expect(appliesToVehicle(task, { model: 'HR-V', year: 2021 })).toBe(true);
  });

  it('no quita ninguna otra tarea del CR-V', () => {
    const all = tasksForService(FACO_HONDA_PLAN, 'B', 80_000);
    const crv = tasksForService(FACO_HONDA_PLAN, 'B', 80_000, CRV_2021);
    expect(all.length - crv.length).toBe(1);
  });
});
