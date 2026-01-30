import apiClient from '../client';
import type {
  TrackCycle,
  CreateTrackCycleDto,
  UpdateTrackCycleDto,
  UpdateTrackCycleStatusDto,
  TrackCycleQueryParams,
  StudentProgress,
} from '../../types/track-cycle.types';

export const TrackCyclesService = {
  /**
   * Lista ciclos com filtros opcionais
   */
  list(params?: TrackCycleQueryParams) {
    return apiClient.get<TrackCycle[]>('/track-cycles', { params });
  },

  /**
   * Lista apenas ciclos ativos (status = active e dentro do período)
   */
  listActive(contextId?: number, trackId?: number) {
    return apiClient.get<TrackCycle[]>('/track-cycles/active', {
      params: { contextId, trackId },
    });
  },

  /**
   * Busca um ciclo por ID
   */
  get(id: number) {
    return apiClient.get<TrackCycle>(`/track-cycles/${id}`);
  },

  /**
   * Cria um novo ciclo
   */
  create(data: CreateTrackCycleDto) {
    return apiClient.post<TrackCycle>('/track-cycles', data);
  },

  /**
   * Atualiza um ciclo
   */
  update(id: number, data: UpdateTrackCycleDto) {
    return apiClient.put<TrackCycle>(`/track-cycles/${id}`, data);
  },

  /**
   * Atualiza o status de um ciclo
   */
  updateStatus(id: number, data: UpdateTrackCycleStatusDto) {
    return apiClient.patch<TrackCycle>(`/track-cycles/${id}/status`, data);
  },

  /**
   * Deleta um ciclo (soft delete)
   */
  delete(id: number) {
    return apiClient.delete(`/track-cycles/${id}`);
  },

  /**
   * Lista participantes e seus progressos em um ciclo
   */
  getStudentsProgress(id: number) {
    return apiClient.get<StudentProgress[]>(`/track-cycles/${id}/students`);
  },
};
