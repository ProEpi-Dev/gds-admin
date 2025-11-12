import type { PaginationQuery } from './api.types';

export type ContextAccessType = 'PUBLIC' | 'PRIVATE';

export interface Context {
  id: number;
  locationId: number | null;
  name: string;
  description: string | null;
  type: string | null;
  accessType: ContextAccessType;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateContextDto {
  name: string;
  locationId?: number;
  accessType: ContextAccessType;
  description?: string;
  type?: string;
  active?: boolean;
}

export interface UpdateContextDto {
  name?: string;
  locationId?: number;
  accessType?: ContextAccessType;
  description?: string;
  type?: string;
  active?: boolean;
}

export interface ContextQuery extends PaginationQuery {
  active?: boolean;
  locationId?: number;
  accessType?: ContextAccessType;
}

