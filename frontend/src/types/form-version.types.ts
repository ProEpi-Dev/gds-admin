import type { PaginationQuery } from './api.types';

export type FormVersionAccessType = 'PUBLIC' | 'PRIVATE';

export interface FormVersion {
  id: number;
  formId: number;
  versionNumber: number;
  accessType: FormVersionAccessType;
  definition: any;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateFormVersionDto {
  accessType: FormVersionAccessType;
  definition: any;
  active?: boolean;
}

export interface UpdateFormVersionDto {
  accessType?: FormVersionAccessType;
  definition?: any;
  active?: boolean;
}

export interface FormVersionQuery extends PaginationQuery {
  active?: boolean;
}

