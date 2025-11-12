import apiClient from '../client';
import { API_ENDPOINTS } from '../endpoints';
import type { CreateParticipationDto, UpdateParticipationDto, ParticipationQuery, Participation } from '../../types/participation.types';
import type { ListResponse } from '../../types/api.types';

export const participationsService = {
  async findAll(query?: ParticipationQuery): Promise<ListResponse<Participation>> {
    const params = new URLSearchParams();
    if (query?.page) params.append('page', query.page.toString());
    if (query?.pageSize) params.append('pageSize', query.pageSize.toString());
    if (query?.active !== undefined) params.append('active', query.active.toString());
    if (query?.userId) params.append('userId', query.userId.toString());
    if (query?.contextId) params.append('contextId', query.contextId.toString());

    const response = await apiClient.get(`${API_ENDPOINTS.PARTICIPATIONS.LIST}?${params.toString()}`);
    return response.data;
  },

  async findOne(id: number): Promise<Participation> {
    const response = await apiClient.get(API_ENDPOINTS.PARTICIPATIONS.DETAIL(id));
    return response.data;
  },

  async create(data: CreateParticipationDto): Promise<Participation> {
    const response = await apiClient.post(API_ENDPOINTS.PARTICIPATIONS.CREATE, data);
    return response.data;
  },

  async update(id: number, data: UpdateParticipationDto): Promise<Participation> {
    const response = await apiClient.patch(API_ENDPOINTS.PARTICIPATIONS.UPDATE(id), data);
    return response.data;
  },

  async remove(id: number): Promise<void> {
    await apiClient.delete(API_ENDPOINTS.PARTICIPATIONS.DELETE(id));
  },
};

