/**
 * Planes de mantenimiento por marca y agencia.
 * El primer set de datos es el plan de FACO (Franz Amrhein & Co.),
 * distribuidor de Honda en Costa Rica. Es el mismo para todos los modelos Honda.
 */

export type TaskFlag = 'si_aplica' | 'solo_mano_de_obra' | 'si_amerita';

export type TaskArea =
  | 'Motor y lubricación'
  | 'Transmisión y diferenciales'
  | 'Frenos'
  | 'Dirección y refrigeración'
  | 'Llantas'
  | 'Eléctrico y batería'
  | 'Visibilidad'
  | 'Suspensión'
  | 'Climatización'
  | 'Carrocería'
  | 'Diagnóstico';

export const TASK_FLAG_LABELS: Record<TaskFlag, string> = {
  si_aplica: 'Si aplica',
  solo_mano_de_obra: 'Solo mano de obra',
  si_amerita: 'Si amerita',
};

export interface MaintenanceTask {
  id: string;
  name: string;
  area: TaskArea;
  flags?: TaskFlag[];
  /** Solo se incluye cuando el kilometraje del servicio es múltiplo de este valor. */
  onlyEveryKm?: number;
}

export interface IncludedPart {
  id: string;
  name: string;
  flags?: TaskFlag[];
}

export interface ServiceType {
  code: string;
  name: string;
  shortName: string;
  intervalKm: number;
  subtitle?: string;
  tasks: MaintenanceTask[];
  includedParts?: IncludedPart[];
}

export interface MaintenancePlan {
  id: string;
  brand: string;
  dealerId: string;
  dealerName: string;
  dealerFullName: string;
  country: string;
  countryCode: string;
  appliesToAllBrandModels: boolean;
  /** Ciclo base en km (Revisión A). */
  intervalKm: number;
  serviceTypes: ServiceType[];
  rules: {
    /** Cuando coincide el intervalo de B con el de A, solo se realiza la B. */
    bReplacesA: boolean;
    radiatorFluidEveryKm: number;
  };
}

export interface DealerCatalog {
  dealers: MaintenancePlan[];
}

const revisionATasks: MaintenanceTask[] = [
  { id: 'a-aceite-motor', name: 'Cambio de aceite de motor', area: 'Motor y lubricación' },
  { id: 'a-filtro-aceite', name: 'Cambio de filtro de aceite', area: 'Motor y lubricación' },
  { id: 'a-tapon-carter', name: 'Cambio de tapón de cárter', area: 'Motor y lubricación' },
  {
    id: 'a-arandela-tapon',
    name: 'Cambio de arandela del tapón de cárter',
    area: 'Motor y lubricación',
  },
  { id: 'a-niveles-aceite', name: 'Revisión de todos los niveles de aceite', area: 'Motor y lubricación' },
  { id: 'a-freno-mano', name: 'Ajuste de freno de mano', area: 'Frenos' },
  { id: 'a-diag-bateria', name: 'Diagnóstico de batería', area: 'Eléctrico y batería' },
  { id: 'a-bornes-bateria', name: 'Limpieza de bornes de batería', area: 'Eléctrico y batería' },
  { id: 'a-luces', name: 'Revisión de luces', area: 'Eléctrico y batería' },
  { id: 'a-pito', name: 'Revisión de funcionamiento de pito', area: 'Eléctrico y batería' },
  { id: 'a-escobillas', name: 'Revisión de escobillas y tirachorritos', area: 'Visibilidad' },
  { id: 'a-ajuste-tirachorritos', name: 'Ajuste de tirachorritos', area: 'Visibilidad' },
  { id: 'a-diag-suspension', name: 'Diagnóstico general de suspensión', area: 'Suspensión' },
  { id: 'a-resoque-suspension', name: 'Resoque general de suspensión', area: 'Suspensión' },
  { id: 'a-presion-llantas', name: 'Medición de presión de llantas', area: 'Llantas' },
  { id: 'a-rotacion-balanceo', name: 'Rotación y balanceo de ruedas', area: 'Llantas' },
  { id: 'a-taco-llantas', name: 'Medición de taco de llantas', area: 'Llantas' },
  { id: 'a-lubricacion', name: 'Lubricación de puertas y ventanas', area: 'Carrocería' },
  { id: 'a-multipuntos', name: 'Diagnóstico multipuntos', area: 'Diagnóstico' },
  {
    id: 'a-reset-mantenimiento',
    name: 'Reseteo de luz de mantenimiento',
    area: 'Diagnóstico',
    flags: ['si_aplica'],
  },
];

const revisionBTasks: MaintenanceTask[] = [
  { id: 'b-aceite-motor', name: 'Cambio de aceite de motor', area: 'Motor y lubricación' },
  { id: 'b-limpieza-inyeccion', name: 'Limpieza del sistema de inyección', area: 'Motor y lubricación' },
  { id: 'b-limpieza-admision', name: 'Limpieza del sistema de admisión', area: 'Motor y lubricación' },
  { id: 'b-filtro-aire', name: 'Cambio de filtro de aire de motor', area: 'Motor y lubricación' },
  {
    id: 'b-bujias',
    name: 'Cambio de bujías',
    area: 'Motor y lubricación',
    flags: ['solo_mano_de_obra'],
  },
  { id: 'b-puesta-punto', name: 'Puesta a punto del motor con scanner', area: 'Motor y lubricación' },
  { id: 'b-aceite-transmision', name: 'Cambio de aceite de transmisión', area: 'Transmisión y diferenciales' },
  {
    id: 'b-aceite-diferencial',
    name: 'Cambio de aceite de diferencial trasero',
    area: 'Transmisión y diferenciales',
    flags: ['si_aplica'],
  },
  { id: 'b-liquido-frenos', name: 'Cambio de líquido de frenos', area: 'Frenos' },
  {
    id: 'b-freno-estacionamiento',
    name: 'Revisión y ajuste de freno de estacionamiento',
    area: 'Frenos',
    flags: ['si_amerita'],
  },
  {
    id: 'b-frenos-general',
    name: 'Revisión, limpieza, engrase y ajuste de frenos general',
    area: 'Frenos',
  },
  {
    id: 'b-fibras-frenos',
    name: 'Cambio de fibras de frenos',
    area: 'Frenos',
    flags: ['solo_mano_de_obra'],
  },
  {
    id: 'b-direccion-hidraulica',
    name: 'Cambio de líquido de dirección hidráulica',
    area: 'Dirección y refrigeración',
    flags: ['si_aplica'],
  },
  {
    id: 'b-liquido-radiador',
    name: 'Cambio de líquido de radiador',
    area: 'Dirección y refrigeración',
    flags: ['solo_mano_de_obra'],
    onlyEveryKm: 80_000,
  },
  { id: 'b-presion-llantas', name: 'Medición de presión de llantas', area: 'Llantas' },
  { id: 'b-taco-llantas', name: 'Medición de taco de llantas', area: 'Llantas' },
  {
    id: 'b-rotacion-balanceo',
    name: 'Rotación y balanceo de llantas',
    area: 'Llantas',
    flags: ['si_amerita'],
  },
  {
    id: 'b-bornes-bateria',
    name: 'Limpieza de bornes de batería',
    area: 'Eléctrico y batería',
    flags: ['si_amerita'],
  },
  { id: 'b-diag-bateria', name: 'Diagnóstico de batería', area: 'Eléctrico y batería' },
  { id: 'b-luces', name: 'Revisión de luces internas y externas', area: 'Eléctrico y batería' },
  {
    id: 'b-pito-escobillas',
    name: 'Revisión de pito, escobillas y tirachorritos',
    area: 'Eléctrico y batería',
  },
  {
    id: 'b-filtro-ac',
    name: 'Cambio de filtro de A/C',
    area: 'Climatización',
    flags: ['solo_mano_de_obra'],
  },
  { id: 'b-diag-suspension', name: 'Diagnóstico de suspensión', area: 'Suspensión' },
  { id: 'b-resoque-suspension', name: 'Resoque de suspensión general', area: 'Suspensión' },
  { id: 'b-lubricacion', name: 'Lubricación de puertas y ventanas', area: 'Carrocería' },
  { id: 'b-multipuntos', name: 'Diagnóstico con hoja multipuntos', area: 'Diagnóstico' },
];

const revisionBIncludedParts: IncludedPart[] = [
  { id: 'p-aceite-motor', name: 'Aceite de motor' },
  { id: 'p-aceite-diferencial', name: 'Aceite de diferencial', flags: ['si_aplica'] },
  { id: 'p-liquido-direccion', name: 'Líquido de dirección hidráulica', flags: ['si_aplica'] },
  { id: 'p-liquido-frenos', name: 'Líquido de frenos' },
  { id: 'p-aceite-transmision', name: 'Aceite de transmisión' },
  { id: 'p-limpiador-admision', name: 'Líquido limpiador de admisión' },
  { id: 'p-limpiador-inyeccion', name: 'Líquido limpiador de inyección' },
  { id: 'p-filtro-aire', name: 'Filtro de aire de motor' },
  { id: 'p-filtro-tapon-arandela', name: 'Filtro, tapón y arandela de aceite de motor' },
  { id: 'p-limpiador-frenos', name: 'Limpiador de frenos' },
];

export const FACO_HONDA_PLAN: MaintenancePlan = {
  id: 'honda-faco-cr',
  brand: 'Honda',
  dealerId: 'faco',
  dealerName: 'FACO',
  dealerFullName: 'Franz Amrhein & Co. (FACO), Honda Costa Rica',
  country: 'Costa Rica',
  countryCode: 'CR',
  appliesToAllBrandModels: true,
  intervalKm: 5_000,
  serviceTypes: [
    {
      code: 'A',
      name: 'Revisión A',
      shortName: 'A',
      intervalKm: 5_000,
      subtitle: 'Servicio Express, cada 5.000 km',
      tasks: revisionATasks,
    },
    {
      code: 'B',
      name: 'Revisión B',
      shortName: 'B',
      intervalKm: 20_000,
      subtitle: 'Cada 20.000 km (reemplaza a la A cuando coinciden)',
      tasks: revisionBTasks,
      includedParts: revisionBIncludedParts,
    },
  ],
  rules: {
    bReplacesA: true,
    radiatorFluidEveryKm: 80_000,
  },
};

export const CATALOG: DealerCatalog = {
  dealers: [FACO_HONDA_PLAN],
};

export function getPlan(brand: string, dealerId?: string): MaintenancePlan | undefined {
  const normalizedBrand = brand.trim().toLowerCase();
  const matches = CATALOG.dealers.filter((plan) => plan.brand.toLowerCase() === normalizedBrand);
  if (dealerId) {
    return matches.find((plan) => plan.dealerId === dealerId);
  }
  return matches[0];
}

export function getServiceType(plan: MaintenancePlan, code: string): ServiceType | undefined {
  return plan.serviceTypes.find((service) => service.code === code);
}

export function tasksForService(
  plan: MaintenancePlan,
  code: string,
  serviceKm: number,
): MaintenanceTask[] {
  const service = getServiceType(plan, code);
  if (!service) return [];
  return service.tasks.filter((task) => !task.onlyEveryKm || serviceKm % task.onlyEveryKm === 0);
}

export function groupTasksByArea(tasks: MaintenanceTask[]): { area: TaskArea; tasks: MaintenanceTask[] }[] {
  const order: TaskArea[] = [
    'Motor y lubricación',
    'Transmisión y diferenciales',
    'Frenos',
    'Dirección y refrigeración',
    'Llantas',
    'Eléctrico y batería',
    'Visibilidad',
    'Suspensión',
    'Climatización',
    'Carrocería',
    'Diagnóstico',
  ];
  const grouped = new Map<TaskArea, MaintenanceTask[]>();
  for (const task of tasks) {
    const list = grouped.get(task.area) ?? [];
    list.push(task);
    grouped.set(task.area, list);
  }
  return order
    .filter((area) => grouped.has(area))
    .map((area) => ({ area, tasks: grouped.get(area)! }));
}
