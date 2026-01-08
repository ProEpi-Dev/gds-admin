import type { PaginationQuery } from './api.types';
import type { Form } from './form.types';

export interface ContentQuiz {
  id: number;
  contentId: number;
  formId: number;
  displayOrder: number;
  isRequired: boolean;
  weight: number;
  active: boolean;
  createdAt: string;
  updatedAt: string;
  content?: {
    id: number;
    title: string;
    reference: string;
  };
  form?: {
    id: number;
    title: string;
    reference: string | null;
    type: string;
  };
}

export interface CreateContentQuizDto {
  contentId: number;
  formId: number;
  displayOrder?: number;
  isRequired?: boolean;
  weight?: number;
  active?: boolean;
}

export interface UpdateContentQuizDto {
  displayOrder?: number;
  isRequired?: boolean;
  weight?: number;
  active?: boolean;
}

export interface ContentQuizQuery extends PaginationQuery {
  contentId?: number;
  formId?: number;
  active?: boolean;
}

