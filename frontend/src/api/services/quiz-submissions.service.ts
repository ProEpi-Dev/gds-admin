import apiClient from '../client';
import type {
  QuizSubmission,
  CreateQuizSubmissionDto,
  UpdateQuizSubmissionDto,
  QuizSubmissionQuery,
} from '../../types/quiz-submission.types';
import type { ListResponse } from '../../types/api.types';

export const quizSubmissionsService = {
  async findAll(
    query?: QuizSubmissionQuery,
  ): Promise<ListResponse<QuizSubmission>> {
    const params = new URLSearchParams();
    if (query?.page) params.append('page', query.page.toString());
    if (query?.pageSize) {
      const pageSize = Math.min(query.pageSize, 100); // Limitar a 100
      params.append('pageSize', pageSize.toString());
    }
    if (query?.participationId)
      params.append('participationId', query.participationId.toString());
    if (query?.formVersionId)
      params.append('formVersionId', query.formVersionId.toString());
    if (query?.active !== undefined) {
      params.append('active', query.active ? 'true' : 'false');
    }
    if (query?.isPassed !== undefined) {
      params.append('isPassed', query.isPassed ? 'true' : 'false');
    }

    const response = await apiClient.get(
      `/quiz-submissions?${params.toString()}`,
    );
    return response.data;
  },

  async findOne(id: number): Promise<QuizSubmission> {
    const response = await apiClient.get(`/quiz-submissions/${id}`);
    return response.data;
  },

  async create(data: CreateQuizSubmissionDto): Promise<QuizSubmission> {
    const response = await apiClient.post('/quiz-submissions', data);
    return response.data;
  },

  async update(
    id: number,
    data: UpdateQuizSubmissionDto,
  ): Promise<QuizSubmission> {
    const response = await apiClient.patch(`/quiz-submissions/${id}`, data);
    return response.data;
  },

  async remove(id: number): Promise<void> {
    await apiClient.delete(`/quiz-submissions/${id}`);
  },
};

