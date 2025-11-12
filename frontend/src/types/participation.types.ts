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
}

