import type { PaginationQuery } from './api.types';
import type { Context } from './context.types';
import type { FormVersion } from './form-version.types';

export type FormType = 'signal' | 'quiz';

export interface Form {
  id: number;
  contextId: number | null;
  context?: Context | null;
  title: string;
  reference: string | null;
  description: string | null;
  type: FormType;
  active: boolean;
  createdAt: string;
  updatedAt: string;
  latestVersion?: FormVersion | null;
}

export interface CreateFormDto {
  title: string;
  type: FormType;
  reference?: string;
  description?: string;
  active?: boolean;
}

export interface UpdateFormDto {
  title?: string;
  type?: FormType;
  reference?: string;
  description?: string;
  active?: boolean;
}

export interface FormQuery extends PaginationQuery {
  active?: boolean;
  type?: FormType;
}

