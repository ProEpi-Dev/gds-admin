import type { PaginationQuery } from './api.types';

export type ContextAccessType = 'PUBLIC' | 'PRIVATE';
export type ContextModuleCode = 'self_health' | 'community_signal';

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
  modules: ContextModuleCode[];
}

export interface CreateContextDto {
  name: string;
  locationId?: number;
  accessType: ContextAccessType;
  description?: string;
  type?: string;
  active?: boolean;
  modules?: ContextModuleCode[];
}

export interface UpdateContextDto {
  name?: string;
  locationId?: number;
  accessType?: ContextAccessType;
  description?: string;
  type?: string;
  active?: boolean;
  modules?: ContextModuleCode[];
}

export interface ContextQuery extends PaginationQuery {
  active?: boolean;
  locationId?: number;
  accessType?: ContextAccessType;
}

