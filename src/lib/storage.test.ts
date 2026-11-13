import AsyncStorage from '@react-native-async-storage/async-storage';
import { afterEach, beforeEach, describe, expect, it, jest } from '@jest/globals';
import type { ServiceRecord, Vehicle } from '../types';
import { loadHistory, loadVehicle, saveHistory, saveVehicle } from './storage';

const store = new Map<string, string>();

jest.mock('@react-native-async-storage/async-storage', () => ({
  __esModule: true,
  default: {
    getItem: jest.fn(async (key: string) => store.get(key) ?? null),
    setItem: jest.fn(async (key: string, value: string) => {
      store.set(key, value);
    }),
    removeItem: jest.fn(async (key: string) => {
      store.delete(key);
    }),
  },
}));

const vehicle: Vehicle = {
  brand: 'Honda',
  dealerId: 'faco',
  model: 'Civic',
  year: 2020,
  currentKm: 45_000,
  avgKmPerMonth: 1_200,
  updatedAt: '2026-11-13T00:00:00.000Z',
};

const history: ServiceRecord[] = [
  {
    id: '1',
    date: '2026-10-01',
    km: 40_000,
    workshop: 'FACO',
    cost: 25_000,
    serviceCode: 'A',
    includesRadiator: false,
    completedTaskIds: [],
  },
];

describe('storage', () => {
  beforeEach(() => {
    store.clear();
    jest.clearAllMocks();
  });

  afterEach(() => {
    store.clear();
  });

  it('guarda y lee el vehículo con la clave nueva', async () => {
    await saveVehicle(vehicle);
    expect(store.has('@my-car-maintenance/vehicle')).toBe(true);
    expect(store.has('@mantenimiento-honda/vehicle')).toBe(false);
    await expect(loadVehicle()).resolves.toEqual(vehicle);
  });

  it('migra el vehículo desde la clave anterior si la nueva no existe', async () => {
    store.set('@mantenimiento-honda/vehicle', JSON.stringify(vehicle));
    await expect(loadVehicle()).resolves.toEqual(vehicle);
    expect(store.get('@my-car-maintenance/vehicle')).toBe(JSON.stringify(vehicle));
    expect(store.get('@mantenimiento-honda/vehicle')).toBe(JSON.stringify(vehicle));
  });

  it('prioriza la clave nueva y no sobrescribe con datos viejos', async () => {
    const updated = { ...vehicle, currentKm: 50_000 };
    store.set('@my-car-maintenance/vehicle', JSON.stringify(updated));
    store.set('@mantenimiento-honda/vehicle', JSON.stringify(vehicle));
    await expect(loadVehicle()).resolves.toEqual(updated);
    expect(AsyncStorage.setItem).not.toHaveBeenCalled();
  });

  it('guarda y lee el historial con la clave nueva', async () => {
    await saveHistory(history);
    expect(store.has('@my-car-maintenance/history')).toBe(true);
    await expect(loadHistory()).resolves.toEqual(history);
  });

  it('migra el historial desde la clave anterior si la nueva no existe', async () => {
    store.set('@mantenimiento-honda/history', JSON.stringify(history));
    await expect(loadHistory()).resolves.toEqual(history);
    expect(store.get('@my-car-maintenance/history')).toBe(JSON.stringify(history));
  });

  it('devuelve lista vacía si no hay historial', async () => {
    await expect(loadHistory()).resolves.toEqual([]);
  });

  it('carga un vehículo antiguo sin placa ni fotos', async () => {
    const legacy = {
      brand: 'Honda',
      dealerId: 'faco',
      model: 'Civic',
      year: 2020,
      currentKm: 45_000,
      avgKmPerMonth: 1_200,
      updatedAt: '2026-11-13T00:00:00.000Z',
    };
    store.set('@my-car-maintenance/vehicle', JSON.stringify(legacy));
    const loaded = await loadVehicle();
    expect(loaded).toEqual(legacy);
    expect(loaded?.plate).toBeUndefined();
    expect(loaded?.photoUris).toBeUndefined();
  });

  it('guarda y lee la placa y las fotos cuando existen', async () => {
    const withExtras: Vehicle = {
      ...vehicle,
      plate: 'BCD123',
      photoUris: ['file:///documents/vehicle-photos/photo-1.jpg'],
    };
    await saveVehicle(withExtras);
    await expect(loadVehicle()).resolves.toEqual(withExtras);
  });
});

  it('carga un historial antiguo sin fotos del servicio', async () => {
    const legacy: ServiceRecord[] = [
      {
        id: '1',
        date: '2026-10-01',
        km: 40_000,
        workshop: 'FACO',
        cost: 25_000,
        serviceCode: 'A',
        includesRadiator: false,
        completedTaskIds: [],
      },
    ];
    store.set('@my-car-maintenance/history', JSON.stringify(legacy));
    const loaded = await loadHistory();
    expect(loaded).toEqual(legacy);
    expect(loaded[0]?.photoUris).toBeUndefined();
  });

  it('guarda y lee las fotos de un servicio cuando existen', async () => {
    const withPhotos: ServiceRecord[] = [
      {
        ...history[0]!,
        photoUris: ['file:///documents/service-photos/factura.jpg'],
      },
    ];
    await saveHistory(withPhotos);
    await expect(loadHistory()).resolves.toEqual(withPhotos);
  });
