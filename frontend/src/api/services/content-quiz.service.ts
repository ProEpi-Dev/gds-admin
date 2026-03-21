import apiClient from '../client';
import type {
  ContentQuiz,
  CreateContentQuizDto,
  UpdateContentQuizDto,
  ContentQuizQuery,
} from '../../types/content-quiz.types';
import type { ListResponse } from '../../types/api.types';

function contextParams(contextId?: number) {
  return contextId != null ? { contextId } : undefined;
}

export const contentQuizService = {
  async findAll(query?: ContentQuizQuery): Promise<ListResponse<ContentQuiz>> {
    const params = new URLSearchParams();
    if (query?.page) params.append('page', query.page.toString());
    if (query?.pageSize) {
      const pageSize = Math.min(query.pageSize, 100); // Limitar a 100
      params.append('pageSize', pageSize.toString());
    }
    if (query?.contentId) params.append('contentId', query.contentId.toString());
    if (query?.formId) params.append('formId', query.formId.toString());
    if (query?.active !== undefined) {
      params.append('active', query.active ? 'true' : 'false');
    }
    if (query?.contextId != null) {
      params.append('contextId', query.contextId.toString());
    }

    const response = await apiClient.get(`/content-quiz?${params.toString()}`);
    return response.data;
  },

  async findOne(id: number, contextId?: number): Promise<ContentQuiz> {
    const response = await apiClient.get(`/content-quiz/${id}`, {
      params: contextParams(contextId),
    });
    return response.data;
  },

  async create(
    data: CreateContentQuizDto,
    contextId?: number,
  ): Promise<ContentQuiz> {
    const response = await apiClient.post('/content-quiz', data, {
      params: contextParams(contextId),
    });
    return response.data;
  },

  async update(
    id: number,
    data: UpdateContentQuizDto,
    contextId?: number,
  ): Promise<ContentQuiz> {
    const response = await apiClient.patch(`/content-quiz/${id}`, data, {
      params: contextParams(contextId),
    });
    return response.data;
  },

  async remove(id: number, contextId?: number): Promise<void> {
    await apiClient.delete(`/content-quiz/${id}`, {
      params: contextParams(contextId),
    });
  },
};

