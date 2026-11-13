import { describe, expect, it } from '@jest/globals';
import type { Vehicle } from '../types';
import { rootNavigationKey } from './root';

const vehicle: Vehicle = {
  brand: 'Honda',
  dealerId: 'faco',
  model: 'Civic',
  year: 2020,
  currentKm: 45_000,
  avgKmPerMonth: 1_200,
  updatedAt: '2026-11-13T00:00:00.000Z',
};

describe('rootNavigationKey', () => {
  it('usa onboarding cuando todavía no hay vehículo', () => {
    expect(rootNavigationKey(null)).toBe('onboarding');
  });

  it('cambia a app en cuanto se guarda el vehículo, sin recargar', () => {
    expect(rootNavigationKey(vehicle)).toBe('app');
  });
});
