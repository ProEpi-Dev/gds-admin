import type { PaginationQuery } from './api.types';

export interface Participation {
  id: number;
  userId: number;
  contextId: number;
  startDate: string;
  endDate: string | null;
  active: boolean;
  createdAt: string;
  updatedAt: string;
  /** Nome do usuário (quando includeUser=true na listagem) */
  userName?: string;
  /** Email do usuário (quando includeUser=true na listagem) */
  userEmail?: string;
}

export interface CreateParticipationDto {
  userId: number;
  contextId: number;
  startDate: string;
  endDate?: string;
  active?: boolean;
}

export interface UpdateParticipationDto {
  userId?: number;
  contextId?: number;
  startDate?: string;
  endDate?: string | null;
  active?: boolean;
}

export interface ParticipationQuery extends PaginationQuery {
  active?: boolean;
  userId?: number;
  contextId?: number;
  /** Incluir nome e email do usuário na resposta */
  includeUser?: boolean;
  /** Buscar por nome ou email do usuário (server-side) */
  search?: string;
}

