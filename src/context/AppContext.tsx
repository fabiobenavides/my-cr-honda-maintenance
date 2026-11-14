import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { getPlan } from '../data/faco-honda';
import { scheduleNextServiceReminder } from '../lib/notifications';
import { upcomingServices } from '../lib/schedule';
import { deleteRemovedPhotos } from '../lib/photos';
import { sortRepairs } from '../lib/repairs';
import { loadHistory, loadRepairs, loadVehicle, saveHistory, saveRepairs, saveVehicle } from '../lib/storage';
import type { RepairRecord, ServiceRecord, Vehicle } from '../types';

type AppContextValue = {
  ready: boolean;
  vehicle: Vehicle | null;
  history: ServiceRecord[];
  /** Arreglos independientes. No entran en el cálculo del plan. */
  repairs: RepairRecord[];
  saveVehicleData: (vehicle: Vehicle) => Promise<void>;
  addService: (record: ServiceRecord) => Promise<void>;
  updateService: (id: string, patch: Partial<ServiceRecord>) => Promise<void>;
  deleteService: (id: string) => Promise<void>;
  addRepair: (record: RepairRecord) => Promise<void>;
  deleteRepair: (id: string) => Promise<void>;
};

const AppContext = createContext<AppContextValue | undefined>(undefined);

export function AppProvider({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false);
  const [vehicle, setVehicle] = useState<Vehicle | null>(null);
  const [history, setHistory] = useState<ServiceRecord[]>([]);
  const [repairs, setRepairs] = useState<RepairRecord[]>([]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [storedVehicle, storedHistory, storedRepairs] = await Promise.all([
          loadVehicle(),
          loadHistory(),
          loadRepairs(),
        ]);
        if (cancelled) return;
        setVehicle(storedVehicle);
        setHistory(storedHistory);
        setRepairs(sortRepairs(storedRepairs));
      } catch {
        if (cancelled) return;
        setVehicle(null);
        setHistory([]);
        setRepairs([]);
      } finally {
        if (!cancelled) setReady(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const refreshReminder = useCallback(async (nextVehicle: Vehicle | null, nextHistory: ServiceRecord[]) => {
    if (!nextVehicle) {
      await scheduleNextServiceReminder(undefined);
      return;
    }
    const plan = getPlan(nextVehicle.brand, nextVehicle.dealerId);
    const next = upcomingServices(nextVehicle.currentKm, {
      count: 1,
      completedKms: nextHistory.map((record) => record.km),
      kmPerMonth: nextVehicle.avgKmPerMonth,
      plan,
    })[0];
    await scheduleNextServiceReminder(next);
  }, []);

  useEffect(() => {
    if (!ready) return;
    refreshReminder(vehicle, history).catch(() => {
      // Las notificaciones pueden fallar en web o si el usuario deniega el permiso.
    });
  }, [ready, vehicle, history, refreshReminder]);

  const saveVehicleData = useCallback(async (next: Vehicle) => {
    await saveVehicle(next);
    setVehicle(next);
  }, []);

  const addService = useCallback(async (record: ServiceRecord) => {
    setHistory((current) => {
      const next = [record, ...current].sort((a, b) => b.km - a.km || b.date.localeCompare(a.date));
      void saveHistory(next);
      return next;
    });
  }, []);

  const updateService = useCallback(async (id: string, patch: Partial<ServiceRecord>) => {
    setHistory((current) => {
      const next = current.map((record) => (record.id === id ? { ...record, ...patch } : record));
      void saveHistory(next);
      return next;
    });
  }, []);

  const deleteService = useCallback(async (id: string) => {
    setHistory((current) => {
      const record = current.find((item) => item.id === id);
      if (record?.photoUris?.length) {
        void deleteRemovedPhotos(record.photoUris, undefined, 'service');
      }
      const next = current.filter((item) => item.id !== id);
      void saveHistory(next);
      return next;
    });
  }, []);

  const addRepair = useCallback(async (record: RepairRecord) => {
    setRepairs((current) => {
      const next = sortRepairs([record, ...current]);
      void saveRepairs(next);
      return next;
    });
  }, []);

  const deleteRepair = useCallback(async (id: string) => {
    setRepairs((current) => {
      const record = current.find((item) => item.id === id);
      if (record?.photoUris?.length) {
        void deleteRemovedPhotos(record.photoUris, undefined, 'service');
      }
      const next = current.filter((item) => item.id !== id);
      void saveRepairs(next);
      return next;
    });
  }, []);

  const value = useMemo(
    () => ({
      ready,
      vehicle,
      history,
      repairs,
      saveVehicleData,
      addService,
      updateService,
      deleteService,
      addRepair,
      deleteRepair,
    }),
    [ready, vehicle, history, repairs, saveVehicleData, addService, updateService, deleteService, addRepair, deleteRepair],
  );

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp(): AppContextValue {
  const value = useContext(AppContext);
  if (!value) {
    throw new Error('useApp debe usarse dentro de AppProvider');
  }
  return value;
}
