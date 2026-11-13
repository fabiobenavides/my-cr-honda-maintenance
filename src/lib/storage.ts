import AsyncStorage from '@react-native-async-storage/async-storage';
import type { ServiceRecord, Vehicle } from '../types';

const VEHICLE_KEY = '@my-car-maintenance/vehicle';
const HISTORY_KEY = '@my-car-maintenance/history';
const LEGACY_VEHICLE_KEY = '@mantenimiento-honda/vehicle';
const LEGACY_HISTORY_KEY = '@mantenimiento-honda/history';

async function readWithMigration(currentKey: string, legacyKey: string): Promise<string | null> {
  const current = await AsyncStorage.getItem(currentKey);
  if (current != null) {
    return current;
  }

  const legacy = await AsyncStorage.getItem(legacyKey);
  if (legacy == null) {
    return null;
  }

  await AsyncStorage.setItem(currentKey, legacy);
  return legacy;
}

export async function loadVehicle(): Promise<Vehicle | null> {
  const raw = await readWithMigration(VEHICLE_KEY, LEGACY_VEHICLE_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as Vehicle;
  } catch {
    return null;
  }
}

export async function saveVehicle(vehicle: Vehicle): Promise<void> {
  await AsyncStorage.setItem(VEHICLE_KEY, JSON.stringify(vehicle));
}

export async function loadHistory(): Promise<ServiceRecord[]> {
  const raw = await readWithMigration(HISTORY_KEY, LEGACY_HISTORY_KEY);
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as ServiceRecord[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export async function saveHistory(history: ServiceRecord[]): Promise<void> {
  await AsyncStorage.setItem(HISTORY_KEY, JSON.stringify(history));
}
