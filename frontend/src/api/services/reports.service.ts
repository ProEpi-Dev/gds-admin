import apiClient from '../client';
import { API_ENDPOINTS } from '../endpoints';
import type { CreateReportDto, UpdateReportDto, ReportQuery, Report } from '../../types/report.types';
import type { ListResponse } from '../../types/api.types';

export const reportsService = {
  async findAll(query?: ReportQuery): Promise<ListResponse<Report>> {
    const params = new URLSearchParams();
    if (query?.page) params.append('page', query.page.toString());
    if (query?.pageSize) params.append('pageSize', query.pageSize.toString());
    if (query?.active !== undefined) params.append('active', query.active.toString());
    if (query?.participationId) params.append('participationId', query.participationId.toString());
    if (query?.formVersionId) params.append('formVersionId', query.formVersionId.toString());
    if (query?.reportType) params.append('reportType', query.reportType);

    const response = await apiClient.get(`${API_ENDPOINTS.REPORTS.LIST}?${params.toString()}`);
    return response.data;
  },

  async findOne(id: number): Promise<Report> {
    const response = await apiClient.get(API_ENDPOINTS.REPORTS.DETAIL(id));
    return response.data;
  },

  async create(data: CreateReportDto): Promise<Report> {
    const response = await apiClient.post(API_ENDPOINTS.REPORTS.CREATE, data);
    return response.data;
  },

  async update(id: number, data: UpdateReportDto): Promise<Report> {
    const response = await apiClient.patch(API_ENDPOINTS.REPORTS.UPDATE(id), data);
    return response.data;
  },

  async remove(id: number): Promise<void> {
    await apiClient.delete(API_ENDPOINTS.REPORTS.DELETE(id));
  },
};

