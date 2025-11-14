import type { PaginationQuery } from './api.types';

export type ReportType = 'POSITIVE' | 'NEGATIVE';

export interface Report {
  id: number;
  participationId: number;
  formVersionId: number;
  reportType: ReportType;
  occurrenceLocation: any | null;
  formResponse: any;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ReportPoint {
  latitude: number;
  longitude: number;
  reportType: ReportType;
}

export interface ReportsPointsQuery {
  formId?: number;
  startDate: string;
  endDate: string;
}

export interface CreateReportDto {
  participationId: number;
  formVersionId: number;
  reportType: ReportType;
  formResponse: any;
  occurrenceLocation?: any;
  active?: boolean;
}

export interface UpdateReportDto {
  participationId?: number;
  formVersionId?: number;
  reportType?: ReportType;
  formResponse?: any;
  occurrenceLocation?: any;
  active?: boolean;
}

export interface ReportQuery extends PaginationQuery {
  active?: boolean;
  participationId?: number;
  formVersionId?: number;
  reportType?: ReportType;
}
