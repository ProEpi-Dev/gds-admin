import apiClient from '../client';
import { API_ENDPOINTS } from '../endpoints';
import type { CreateFormDto, UpdateFormDto, FormQuery } from '../../types/form.types';
import type { ListResponse } from '../../types/api.types';
import type { FormWithVersion } from '../../types/form-with-version.types';

export const formsService = {
  async findAll(query?: FormQuery): Promise<ListResponse<any>> {
    const params = new URLSearchParams();
    if (query?.page) params.append('page', query.page.toString());
    if (query?.pageSize) params.append('pageSize', query.pageSize.toString());
    if (query?.active !== undefined) params.append('active', query.active.toString());
    if (query?.type) params.append('type', query.type);

    const response = await apiClient.get(`${API_ENDPOINTS.FORMS.LIST}?${params.toString()}`);
    return response.data;
  },

  async findOne(id: number): Promise<any> {
    const response = await apiClient.get(API_ENDPOINTS.FORMS.DETAIL(id));
    return response.data;
  },

  async create(data: CreateFormDto): Promise<any> {
    const response = await apiClient.post(API_ENDPOINTS.FORMS.CREATE, data);
    return response.data;
  },

  async update(id: number, data: UpdateFormDto): Promise<any> {
    const response = await apiClient.patch(API_ENDPOINTS.FORMS.UPDATE(id), data);
    return response.data;
  },

  async remove(id: number): Promise<void> {
    await apiClient.delete(API_ENDPOINTS.FORMS.DELETE(id));
  },

  async findFormsWithLatestVersions(): Promise<FormWithVersion[]> {
    const response = await apiClient.get(`${API_ENDPOINTS.FORMS.LIST}/with-latest-versions`);
    return response.data;
  },
};

