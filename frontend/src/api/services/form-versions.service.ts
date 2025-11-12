import apiClient from '../client';
import { API_ENDPOINTS } from '../endpoints';
import type {
  CreateFormVersionDto,
  UpdateFormVersionDto,
  FormVersionQuery,
} from '../../types/form-version.types';
import type { ListResponse } from '../../types/api.types';

export const formVersionsService = {
  async findAllByForm(formId: number, query?: FormVersionQuery): Promise<ListResponse<any>> {
    const params = new URLSearchParams();
    if (query?.page) params.append('page', query.page.toString());
    if (query?.pageSize) params.append('pageSize', query.pageSize.toString());
    if (query?.active !== undefined) params.append('active', query.active.toString());

    const response = await apiClient.get(
      `${API_ENDPOINTS.FORM_VERSIONS.LIST(formId)}?${params.toString()}`,
    );
    return response.data;
  },

  async findOne(formId: number, id: number): Promise<any> {
    const response = await apiClient.get(API_ENDPOINTS.FORM_VERSIONS.DETAIL(formId, id));
    return response.data;
  },

  async create(formId: number, data: CreateFormVersionDto): Promise<any> {
    const response = await apiClient.post(API_ENDPOINTS.FORM_VERSIONS.CREATE(formId), data);
    return response.data;
  },

  async update(formId: number, id: number, data: UpdateFormVersionDto): Promise<any> {
    const response = await apiClient.patch(API_ENDPOINTS.FORM_VERSIONS.UPDATE(formId, id), data);
    return response.data;
  },

  async remove(formId: number, id: number): Promise<void> {
    await apiClient.delete(API_ENDPOINTS.FORM_VERSIONS.DELETE(formId, id));
  },
};

