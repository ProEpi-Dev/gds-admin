import type { PaginationQuery } from './api.types';

/** Nível da localização na hierarquia (administrativo ou de local/ponto). */
export type LocationOrgLevelValue =
  | 'COUNTRY'
  | 'STATE_DISTRICT'
  | 'CITY_COUNCIL'
  | 'SITE';

export interface ParentLocation {
  id: number;
  name: string;
  parent?: ParentLocation; // Recursivo até 3 níveis
}

export interface Location {
  id: number;
  parentId: number | null;
  parent?: ParentLocation; // Hierarquia até 3 níveis
  name: string;
  orgLevel: LocationOrgLevelValue;
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
  orgLevel?: LocationOrgLevelValue;
  latitude?: number;
  longitude?: number;
  polygons?: any;
  active?: boolean;
}

export interface UpdateLocationDto {
  name?: string;
  parentId?: number;
  orgLevel?: LocationOrgLevelValue;
  longitude?: number;
  latitude?: number;
  polygons?: any;
  active?: boolean;
}

export interface LocationQuery extends PaginationQuery {
  active?: boolean;
  parentId?: number;
  orgLevel?: LocationOrgLevelValue;
}

