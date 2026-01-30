import apiClient from '../client';
import type {
  TrackProgress,
  StartTrackProgressDto,
  UpdateSequenceProgressDto,
  TrackProgressQueryParams,
  CanAccessSequenceResponse,
  SequenceProgress,
  TrackExecutionRow,
  TrackExecutionsQueryParams,
} from '../../types/track-progress.types';

export const TrackProgressService = {
  /**
   * Inicia o progresso em um ciclo
   */
  start(data: StartTrackProgressDto) {
    return apiClient.post<TrackProgress>('/track-progress/start', data);
  },

  /**
   * Lista progressos com filtros
   */
  list(params?: TrackProgressQueryParams) {
    return apiClient.get<TrackProgress[]>('/track-progress', { params });
  },

  /**
   * Lista execuções (conclusões de sequências) com filtros
   */
  getExecutions(params?: TrackExecutionsQueryParams) {
    return apiClient.get<TrackExecutionRow[]>('/track-progress/executions', {
      params,
    });
  },

  /**
   * Lista meu progresso (usuário autenticado)
   */
  getMyProgress() {
    return apiClient.get<TrackProgress[]>('/track-progress/my-progress');
  },

  /**
   * Histórico de ciclos completados pelo usuário
   */
  getHistory() {
    return apiClient.get<TrackProgress[]>('/track-progress/history');
  },

  /**
   * Busca progresso por participação e ciclo
   */
  getByParticipationAndCycle(participationId: number, cycleId: number) {
    return apiClient.get<TrackProgress>(
      `/track-progress/participation/${participationId}/cycle/${cycleId}`,
    );
  },

  /**
   * Verifica se pode acessar uma sequência (bloqueio sequencial)
   */
  canAccessSequence(trackProgressId: number, sequenceId: number) {
    return apiClient.get<CanAccessSequenceResponse>(
      `/track-progress/${trackProgressId}/can-access/sequence/${sequenceId}`,
    );
  },

  /**
   * Atualiza progresso de uma sequência
   */
  updateSequenceProgress(
    trackProgressId: number,
    sequenceId: number,
    data: UpdateSequenceProgressDto,
  ) {
    return apiClient.put<SequenceProgress>(
      `/track-progress/${trackProgressId}/sequence/${sequenceId}`,
      data,
    );
  },

  /**
   * Marca conteúdo como completado
   */
  completeContent(trackProgressId: number, sequenceId: number) {
    return apiClient.post(
      `/track-progress/${trackProgressId}/sequence/${sequenceId}/complete-content`,
    );
  },

  /**
   * Marca quiz como completado
   */
  completeQuiz(
    trackProgressId: number,
    sequenceId: number,
    quizSubmissionId: number,
  ) {
    return apiClient.post(
      `/track-progress/${trackProgressId}/sequence/${sequenceId}/complete-quiz`,
      { quizSubmissionId },
    );
  },

  /**
   * Recalcula progresso da trilha
   */
  recalculate(trackProgressId: number) {
    return apiClient.post(`/track-progress/${trackProgressId}/recalculate`);
  },
};
