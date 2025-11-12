import apiClient from '../client';
import { API_ENDPOINTS } from '../endpoints';
import type {
  CreateContextManagerDto,
  UpdateContextManagerDto,
  ContextManagerQuery,
  ContextManager,
} from '../../types/context-manager.types';
import type { ListResponse } from '../../types/api.types';

export const contextManagersService = {
  async findAllByContext(
    contextId: number,
    query?: ContextManagerQuery,
  ): Promise<ListResponse<ContextManager>> {
    const params = new URLSearchParams();
    if (query?.page) params.append('page', query.page.toString());
    if (query?.pageSize) params.append('pageSize', query.pageSize.toString());
    if (query?.active !== undefined) params.append('active', query.active.toString());

    const response = await apiClient.get(
      `${API_ENDPOINTS.CONTEXT_MANAGERS.LIST(contextId)}?${params.toString()}`,
    );
    return response.data;
  },

  async findOne(contextId: number, id: number): Promise<ContextManager> {
    const response = await apiClient.get(API_ENDPOINTS.CONTEXT_MANAGERS.DETAIL(contextId, id));
    return response.data;
  },

  async create(contextId: number, data: CreateContextManagerDto): Promise<ContextManager> {
    const response = await apiClient.post(API_ENDPOINTS.CONTEXT_MANAGERS.CREATE(contextId), data);
    return response.data;
  },

  async update(
    contextId: number,
    id: number,
    data: UpdateContextManagerDto,
  ): Promise<ContextManager> {
    const response = await apiClient.patch(
      API_ENDPOINTS.CONTEXT_MANAGERS.UPDATE(contextId, id),
      data,
    );
    return response.data;
  },

  async remove(contextId: number, id: number): Promise<void> {
    await apiClient.delete(API_ENDPOINTS.CONTEXT_MANAGERS.DELETE(contextId, id));
  },
};

