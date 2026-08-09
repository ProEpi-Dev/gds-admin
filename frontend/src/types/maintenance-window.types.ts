export type MaintenanceMode = 'banner' | 'read_only' | 'full';

/** `pt` é obrigatório: é o fallback do backend ao resolver Accept-Language. */
export interface LocalizedText {
  pt: string;
  en?: string;
  es?: string;
}

export interface MaintenanceWindow {
  id: number;
  mode: MaintenanceMode;
  startsAt: string;
  endsAt: string | null;
  title: LocalizedText;
  message: LocalizedText;
  active: boolean;
  /** Calculado pelo backend: true quando `active` e o instante atual está dentro do período. */
  inEffect: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateMaintenanceWindowDto {
  mode: MaintenanceMode;
  startsAt: string;
  endsAt?: string | null;
  title: LocalizedText;
  message: LocalizedText;
  active?: boolean;
}

export type UpdateMaintenanceWindowDto = Partial<CreateMaintenanceWindowDto>;

export interface MaintenanceWindowQuery {
  page?: number;
  pageSize?: number;
  active?: boolean;
  mode?: MaintenanceMode;
}

/** Resposta de `GET /maintenance/current`, com textos já resolvidos no servidor. */
export interface MaintenanceStatus {
  inMaintenance: boolean;
  mode: MaintenanceMode | null;
  title: string | null;
  message: string | null;
  startsAt: string | null;
  endsAt: string | null;
}
