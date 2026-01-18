export interface User {
  id: number;
  name: string;
  email: string;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateUserDto {
  name: string;
  email: string;
  password: string;
  active?: boolean;
}

import type { PaginationQuery } from './api.types';

export interface UpdateUserDto {
  name?: string;
  email?: string;
  password?: string;
  active?: boolean;
}

export interface UserQuery extends PaginationQuery {
  active?: boolean;
  search?: string;
}

export interface UserRoleResponse {
  isManager: boolean;
  isParticipant: boolean;
  contexts: {
    asManager: number[];
    asParticipant: number[];
  };
}

export interface UpdateProfileDto {
  genderId?: number;
  locationId?: number;
  externalIdentifier?: string;
}

export interface ProfileStatusResponse {
  isComplete: boolean;
  missingFields: string[];
  profile: {
    genderId: number | null;
    locationId: number | null;
    externalIdentifier: string | null;
  };
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
