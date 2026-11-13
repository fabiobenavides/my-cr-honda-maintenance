import type { Vehicle } from '../types';

/**
 * Key for NavigationContainer so its state resets when the user first
 * registers a vehicle (or would clear one). Registrar exists in both the
 * onboarding and the app stacks; if only the inner navigator remounts, the
 * container keeps the Registrar route and the UI stays on the form.
 */
export function rootNavigationKey(vehicle: Vehicle | null): 'app' | 'onboarding' {
  return vehicle ? 'app' : 'onboarding';
}
