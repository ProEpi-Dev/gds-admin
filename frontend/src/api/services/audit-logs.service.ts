import apiClient from '../client';
import { API_ENDPOINTS } from '../endpoints';
import type { ListResponse } from '../../types/api.types';
import type { AuditLog, AuditLogQuery } from '../../types/audit-log.types';

export const auditLogsService = {
  async findAll(query?: AuditLogQuery): Promise<ListResponse<AuditLog>> {
    const params = new URLSearchParams();

    if (query?.page) params.append('page', query.page.toString());
    if (query?.pageSize) params.append('pageSize', query.pageSize.toString());
    if (query?.action) params.append('action', query.action);
    if (query?.targetEntityType) params.append('targetEntityType', query.targetEntityType);
    if (query?.actorUserId != null) params.append('actorUserId', query.actorUserId.toString());
    if (query?.contextId != null) params.append('contextId', query.contextId.toString());
    if (query?.dateFrom) params.append('dateFrom', query.dateFrom);
    if (query?.dateTo) params.append('dateTo', query.dateTo);
    if (query?.search) params.append('search', query.search);
    if (query?.sortDirection) params.append('sortDirection', query.sortDirection);

    const response = await apiClient.get(
      `${API_ENDPOINTS.AUDIT_LOGS.LIST}?${params.toString()}`,
    );
    return response.data;
  },
};
