import type { PaginationQuery } from "./api.types";

export type ReportType = "POSITIVE" | "NEGATIVE";

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
  formId?: number;
  startDate?: string;
  endDate?: string;
  /** Filtrar por contexto (reports cuja participação pertence ao contexto selecionado) */
  contextId?: number;
}

export interface ReportStreakQuery extends PaginationQuery {
  active?: boolean;
  search?: string;
}

export interface ParticipationReportStreakQuery {
  startDate?: string;
  endDate?: string;
}

export interface ReportDaySummary {
  date: string;
  reportCount: number;
  positiveCount: number;
  negativeCount: number;
}

export interface ReportStreakSummary {
  participationId: number;
  userId: number;
  userName: string;
  userEmail: string;
  active: boolean;
  currentStreak: number;
  longestStreak: number;
  reportedDaysCount: number;
  lastReportedDate: string | null;
  currentStreakStartDate: string | null;
}

export interface ParticipationReportStreak extends ReportStreakSummary {
  periodStartDate: string | null;
  periodEndDate: string | null;
  reportedDaysInRangeCount: number;
  reportedDays: ReportDaySummary[];
}
