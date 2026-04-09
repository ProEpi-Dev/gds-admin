import apiClient from '../client';
import { API_ENDPOINTS } from '../endpoints';
import type {
  ParticipationProfileExtraMeResponse,
  SaveParticipationProfileExtraDto,
} from '../../types/participation-profile-extra.types';

export const participationProfileExtraService = {
  async getMe(): Promise<ParticipationProfileExtraMeResponse> {
    const response = await apiClient.get(API_ENDPOINTS.PARTICIPATION_PROFILE_EXTRA.ME);
    return response.data;
  },

  async saveMe(data: SaveParticipationProfileExtraDto): Promise<{
    formVersionId: number;
    response: Record<string, unknown>;
    updatedAt: string;
  }> {
    const response = await apiClient.put(API_ENDPOINTS.PARTICIPATION_PROFILE_EXTRA.ME, data);
    return response.data;
  },
};
