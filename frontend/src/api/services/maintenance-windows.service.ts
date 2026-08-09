import apiClient from '../client';
import { API_ENDPOINTS } from '../endpoints';
import type { ListResponse } from '../../types/api.types';
import type {
  MaintenanceWindow,
  CreateMaintenanceWindowDto,
  UpdateMaintenanceWindowDto,
  MaintenanceWindowQuery,
  MaintenanceStatus,
} from '../../types/maintenance-window.types';

export const maintenanceWindowsService = {
  /** Público e liberado durante manutenção — alimenta o banner do console. */
  async current(): Promise<MaintenanceStatus> {
    const response = await apiClient.get(API_ENDPOINTS.MAINTENANCE.CURRENT);
    return response.data;
  },

  async findAll(
    query?: MaintenanceWindowQuery,
  ): Promise<ListResponse<MaintenanceWindow>> {
    const params = new URLSearchParams();
    if (query?.page) params.append('page', query.page.toString());
    if (query?.pageSize) params.append('pageSize', query.pageSize.toString());
    if (query?.active !== undefined) params.append('active', query.active.toString());
    if (query?.mode) params.append('mode', query.mode);

    const response = await apiClient.get(
      `${API_ENDPOINTS.MAINTENANCE_WINDOWS.LIST}?${params.toString()}`,
    );
    return response.data;
  },

  async findOne(id: number): Promise<MaintenanceWindow> {
    const response = await apiClient.get(
      API_ENDPOINTS.MAINTENANCE_WINDOWS.DETAIL(id),
    );
    return response.data;
  },

  async create(data: CreateMaintenanceWindowDto): Promise<MaintenanceWindow> {
    const response = await apiClient.post(
      API_ENDPOINTS.MAINTENANCE_WINDOWS.CREATE,
      data,
    );
    return response.data;
  },

  async update(
    id: number,
    data: UpdateMaintenanceWindowDto,
  ): Promise<MaintenanceWindow> {
    const response = await apiClient.patch(
      API_ENDPOINTS.MAINTENANCE_WINDOWS.UPDATE(id),
      data,
    );
    return response.data;
  },

  async remove(id: number): Promise<void> {
    await apiClient.delete(API_ENDPOINTS.MAINTENANCE_WINDOWS.DELETE(id));
  },
};
