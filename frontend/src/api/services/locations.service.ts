import apiClient from '../client';
import { API_ENDPOINTS } from '../endpoints';
import type { CreateLocationDto, UpdateLocationDto, LocationQuery, Location } from '../../types/location.types';
import type { ListResponse } from '../../types/api.types';

/** Limite máximo do backend (PaginationQueryDto). */
const MAX_PAGE_SIZE = 100;

export const locationsService = {
  async findAll(query?: LocationQuery): Promise<ListResponse<Location>> {
    const params = new URLSearchParams();
    if (query?.page) params.append('page', query.page.toString());
    if (query?.pageSize) params.append('pageSize', query.pageSize.toString());
    if (query?.active !== undefined) params.append('active', query.active.toString());
    if (query?.parentId) params.append('parentId', query.parentId.toString());
    if (query?.orgLevel) params.append('orgLevel', query.orgLevel);

    const response = await apiClient.get(`${API_ENDPOINTS.LOCATIONS.LIST}?${params.toString()}`);
    return response.data;
  },

  /**
   * Busca todas as páginas e concatena `data` (útil quando a lista pode passar de 100 itens).
   */
  async findAllAllPages(
    query?: Omit<LocationQuery, 'page' | 'pageSize'>,
  ): Promise<Location[]> {
    const pageSize = MAX_PAGE_SIZE;
    const merged: Location[] = [];
    let page = 1;
    const maxPages = 200;

    while (page <= maxPages) {
      const res = await this.findAll({ ...query, page, pageSize });
      merged.push(...res.data);
      if (res.data.length < pageSize) break;
      page += 1;
    }

    return merged;
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

