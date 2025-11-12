import type { PaginationQuery } from './api.types';

export interface ContextManager {
  id: number;
  userId: number;
  contextId: number;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateContextManagerDto {
  userId: number;
  active?: boolean;
}

export interface UpdateContextManagerDto {
  active?: boolean;
}

export interface ContextManagerQuery extends PaginationQuery {
  active?: boolean;
}

