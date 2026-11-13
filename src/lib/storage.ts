import AsyncStorage from '@react-native-async-storage/async-storage';
import type { ServiceRecord, Vehicle } from '../types';

const VEHICLE_KEY = '@mantenimiento-honda/vehicle';
const HISTORY_KEY = '@mantenimiento-honda/history';

export async function loadVehicle(): Promise<Vehicle | null> {
  const raw = await AsyncStorage.getItem(VEHICLE_KEY);
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
  const raw = await AsyncStorage.getItem(HISTORY_KEY);
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
