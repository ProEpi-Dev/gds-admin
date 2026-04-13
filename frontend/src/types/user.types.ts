export interface User {
  id: number;
  name: string;
  email: string;
  active: boolean;
  phone?: string | null;
  countryLocationId?: number | null;
  roleId?: number | null;
  roleName?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateUserDto {
  name: string;
  email: string;
  password: string;
  active?: boolean;
  /** ID do papel global (ex.: admin). Apenas admin pode definir ao criar. */
  roleId?: number;
}

import type { PaginationQuery } from './api.types';

export interface UpdateUserDto {
  name?: string;
  email?: string;
  password?: string;
  active?: boolean;
  roleId?: number | null;
}

export interface UserQuery extends PaginationQuery {
  active?: boolean;
  search?: string;
}

export interface ContextInfo {
  id: number;
  name: string;
}

export interface UserRoleResponse {
  isAdmin: boolean;
  isManager: boolean;
  isContentManager: boolean;
  isParticipant: boolean;
  contexts: {
    asManager: ContextInfo[];
    asParticipant: ContextInfo[];
  };
}

export interface UpdateProfileDto {
  genderId?: number;
  locationId?: number;
  countryLocationId?: number;
  externalIdentifier?: string;
  phone?: string;
}

export interface ProfileStatusResponse {
  isComplete: boolean;
  missingFields: string[];
  profile: {
    genderId: number | null;
    locationId: number | null;
    countryLocationId: number | null;
    externalIdentifier: string | null;
    phone: string | null;
  };
  profileExtraRequired: boolean;
  profileExtraComplete: boolean;
}

export interface LegalAcceptanceStatusResponse {
  needsAcceptance: boolean;
  pendingDocuments: Array<{
    id: number;
    typeCode: string;
    typeName: string;
    version: number;
    title: string;
  }>;
  acceptedDocuments: Array<{
    id: number;
    typeCode: string;
    typeName: string;
    version: number;
    title: string;
    acceptedAt: string;
  }>;
}
