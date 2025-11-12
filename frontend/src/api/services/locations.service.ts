import apiClient from '../client';
import { API_ENDPOINTS } from '../endpoints';
import type { CreateLocationDto, UpdateLocationDto, LocationQuery, Location } from '../../types/location.types';
import type { ListResponse } from '../../types/api.types';

export const locationsService = {
  async findAll(query?: LocationQuery): Promise<ListResponse<Location>> {
    const params = new URLSearchParams();
    if (query?.page) params.append('page', query.page.toString());
    if (query?.pageSize) params.append('pageSize', query.pageSize.toString());
    if (query?.active !== undefined) params.append('active', query.active.toString());
    if (query?.parentId) params.append('parentId', query.parentId.toString());

    const response = await apiClient.get(`${API_ENDPOINTS.LOCATIONS.LIST}?${params.toString()}`);
    return response.data;
  },

  async findOne(id: number): Promise<Location> {
    const response = await apiClient.get(API_ENDPOINTS.LOCATIONS.DETAIL(id));
    return response.data;
  },

  async create(data: CreateLocationDto): Promise<Location> {
    const response = await apiClient.post(API_ENDPOINTS.LOCATIONS.CREATE, data);
    return response.data;
  },

  async update(id: number, data: UpdateLocationDto): Promise<Location> {
    const response = await apiClient.patch(API_ENDPOINTS.LOCATIONS.UPDATE(id), data);
    return response.data;
  },

  async remove(id: number): Promise<void> {
    await apiClient.delete(API_ENDPOINTS.LOCATIONS.DELETE(id));
  },
};

