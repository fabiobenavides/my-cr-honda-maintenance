import { describe, expect, it, jest } from '@jest/globals';
import type { RepairRecord, ServiceRecord } from '../types';
import { MAX_REPAIR_PHOTOS, buildRepairRecord, buildTimeline, nextCurrentKm, sortRepairs, totalSpent } from './repairs';

jest.mock('react-native', () => ({
  Platform: { OS: 'ios' },
}));

const service: ServiceRecord = {
  id: 's1',
  date: '2026-10-01',
  km: 40_000,
  workshop: 'FACO',
  cost: 25_000,
  serviceCode: 'A',
};

const repair: RepairRecord = {
  id: 'r1',
  date: '2026-11-05',
  description: 'Cambio de batería',
  cost: 85_000,
};

describe('buildRepairRecord', () => {
  it('arma un arreglo con solo los campos obligatorios', () => {
    const { record, errors } = buildRepairRecord(
      { date: '05/11/2026', description: '  Cambio de batería ', cost: '85,000' },
      'r1',
    );
    expect(errors).toEqual({});
    expect(record).toEqual(repair);
    expect(record).not.toHaveProperty('km');
    expect(record).not.toHaveProperty('workshop');
    expect(record).not.toHaveProperty('photoUris');
  });

  it('incluye taller, kilometraje y fotos cuando vienen', () => {
    const photos = Array.from({ length: 7 }, (_, i) => `file:///documents/service-photos/p${i}.jpg`);
    const { record } = buildRepairRecord(
      {
        date: '2026-11-05',
        description: 'Alineado',
        cost: '0',
        workshop: ' Llantas del Este ',
        km: '46200.4',
        photoUris: photos,
      },
      'r2',
    );
    expect(record?.workshop).toBe('Llantas del Este');
    expect(record?.km).toBe(46_200);
    expect(record?.cost).toBe(0);
    expect(record?.photoUris).toHaveLength(MAX_REPAIR_PHOTOS);
  });

  it('exige fecha válida, descripción y monto', () => {
    const { record, errors } = buildRepairRecord({ date: '31/02/2026', description: '  ', cost: '' });
    expect(record).toBeNull();
    expect(Object.keys(errors).sort()).toEqual(['cost', 'date', 'description']);
  });

  it('rechaza montos y kilometrajes inválidos', () => {
    const { record, errors } = buildRepairRecord({
      date: '05/11/2026',
      description: 'Algo',
      cost: '-5',
      km: 'abc',
    });
    expect(record).toBeNull();
    expect(errors.cost).toBeDefined();
    expect(errors.km).toBeDefined();
  });
});

describe('buildTimeline', () => {
  it('mezcla servicios y arreglos del más reciente al más viejo', () => {
    const older: RepairRecord = { ...repair, id: 'r0', date: '2026-09-15' };
    const timeline = buildTimeline([service], [older, repair]);
    expect(timeline.map((entry) => `${entry.kind}:${entry.record.id}`)).toEqual([
      'repair:r1',
      'service:s1',
      'repair:r0',
    ]);
  });

  it('funciona con historial antiguo y sin arreglos', () => {
    expect(buildTimeline([service], [])).toEqual([{ kind: 'service', record: service }]);
    expect(buildTimeline([], [])).toEqual([]);
  });
});

describe('totalSpent / sortRepairs / nextCurrentKm', () => {
  it('suma servicios y arreglos', () => {
    expect(totalSpent([service], [repair])).toBe(110_000);
    expect(totalSpent([], [])).toBe(0);
  });

  it('ordena arreglos por fecha descendente', () => {
    const older = { ...repair, id: 'r0', date: '2026-01-01' };
    expect(sortRepairs([older, repair]).map((item) => item.id)).toEqual(['r1', 'r0']);
  });

  it('solo sube el kilometraje si el arreglo trae uno mayor', () => {
    expect(nextCurrentKm(45_000, {})).toBeNull();
    expect(nextCurrentKm(45_000, { km: 44_000 })).toBeNull();
    expect(nextCurrentKm(45_000, { km: 46_200 })).toBe(46_200);
  });
});
