import apiClient from '../client';
import { API_ENDPOINTS } from '../endpoints';
import type { CreateContextDto, UpdateContextDto, ContextQuery, Context } from '../../types/context.types';
import type { ListResponse } from '../../types/api.types';

export const contextsService = {
  async findAll(query?: ContextQuery): Promise<ListResponse<Context>> {
    const params = new URLSearchParams();
    if (query?.page) params.append('page', query.page.toString());
    if (query?.pageSize) params.append('pageSize', query.pageSize.toString());
    if (query?.active !== undefined) params.append('active', query.active.toString());
    if (query?.locationId) params.append('locationId', query.locationId.toString());
    if (query?.accessType) params.append('accessType', query.accessType);

    const response = await apiClient.get(`${API_ENDPOINTS.CONTEXTS.LIST}?${params.toString()}`);
    return response.data;
  },

  async findOne(id: number): Promise<Context> {
    const response = await apiClient.get(API_ENDPOINTS.CONTEXTS.DETAIL(id));
    return response.data;
  },

  async create(data: CreateContextDto): Promise<Context> {
    const response = await apiClient.post(API_ENDPOINTS.CONTEXTS.CREATE, data);
    return response.data;
  },

  async update(id: number, data: UpdateContextDto): Promise<Context> {
    const response = await apiClient.patch(API_ENDPOINTS.CONTEXTS.UPDATE(id), data);
    return response.data;
  },

  async remove(id: number): Promise<void> {
    await apiClient.delete(API_ENDPOINTS.CONTEXTS.DELETE(id));
  },
};

