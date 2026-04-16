import type { PaginationQuery } from './api.types';

export interface AuditLog {
  id: number;
  action: string;
  targetEntityType: string;
  targetEntityId: string;
  actorUserId: number | null;
  actorName: string | null;
  actorEmail: string | null;
  contextId: number | null;
  contextName: string | null;
  targetUserId: number | null;
  targetUserName: string | null;
  targetUserEmail: string | null;
  requestId: string | null;
  channel: string | null;
  ipAddress: string | null;
  userAgent: string | null;
  metadata: Record<string, unknown> | null;
  occurredAt: string;
}

export interface AuditLogQuery extends PaginationQuery {
  action?: string;
  targetEntityType?: string;
  actorUserId?: number;
  contextId?: number;
  dateFrom?: string;
  dateTo?: string;
  search?: string;
  sortDirection?: 'asc' | 'desc';
}
