import type { PaginationQuery } from './api.types';

export interface Location {
  id: number;
  parentId: number | null;
  name: string;
  latitude: number | null;
  longitude: number | null;
  polygons: any | null;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateLocationDto {
  name: string;
  parentId?: number;
  latitude?: number;
  longitude?: number;
  polygons?: any;
  active?: boolean;
}

export interface UpdateLocationDto {
  name?: string;
  parentId?: number;
  longitude?: number;
  latitude?: number;
  polygons?: any;
  active?: boolean;
}

export interface LocationQuery extends PaginationQuery {
  active?: boolean;
  parentId?: number;
}

