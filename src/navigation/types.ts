export type RootStackParamList = {
  Registrar: { edit?: boolean } | undefined;
  Main: undefined;
  Detalle: {
    km: number;
    code: string;
    includesRadiator: boolean;
    estimatedDate?: string | null;
  };
  RegistrarServicio: {
    prefillKm?: number;
    prefillCode?: string;
    includesRadiator?: boolean;
  } | undefined;
};

export type MainTabParamList = {
  Plan: undefined;
  Historial: undefined;
};
