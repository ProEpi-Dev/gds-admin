import {
  useQuery,
  useMutation,
  useQueryClient,
  type UseQueryOptions,
} from "@tanstack/react-query";
import { reportsService } from "../../../api/services/reports.service";
import type {
  CreateReportDto,
  UpdateReportDto,
  ReportQuery,
  ReportsPointsQuery,
  ReportStreakQuery,
  ParticipationReportStreakQuery,
} from "../../../types/report.types";

export function useReports(
  query?: ReportQuery,
  options?: Pick<UseQueryOptions, "enabled">,
) {
  return useQuery({
    queryKey: ["reports", query],
    queryFn: () => reportsService.findAll(query),
    enabled: options?.enabled !== false && query != null,
  });
}

export function useReport(id: number | null) {
  return useQuery({
    queryKey: ["reports", id],
    queryFn: () => (id ? reportsService.findOne(id) : null),
    enabled: !!id,
  });
}

export function useCreateReport() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateReportDto) => reportsService.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["reports"] });
    },
  });
}

export function useUpdateReport() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: UpdateReportDto }) =>
      reportsService.update(id, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["reports"] });
      queryClient.invalidateQueries({ queryKey: ["reports", variables.id] });
    },
  });
}

export function useDeleteReport() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: number) => reportsService.remove(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["reports"] });
    },
  });
}

export function useReportsPoints(query: ReportsPointsQuery) {
  return useQuery({
    queryKey: ["reports", "points", query],
    queryFn: () => reportsService.findPoints(query),
    enabled: !!query.startDate && !!query.endDate,
  });
}

export function useContextReportStreaks(
  contextId: number | null,
  query?: ReportStreakQuery,
) {
  return useQuery({
    queryKey: ["contexts", contextId, "report-streaks", query],
    queryFn: () =>
      reportsService.findContextReportStreaks(contextId as number, query),
    enabled: contextId != null,
  });
}

export function useParticipationReportStreak(
  contextId: number | null,
  participationId: number | null,
  query?: ParticipationReportStreakQuery,
) {
  return useQuery({
    queryKey: ["contexts", contextId, "report-streaks", participationId, query],
    queryFn: () =>
      reportsService.findParticipationReportStreak(
        contextId as number,
        participationId as number,
        query,
      ),
    enabled: contextId != null && participationId != null,
  });
}
