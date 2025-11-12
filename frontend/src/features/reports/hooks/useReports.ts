import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { reportsService } from '../../../api/services/reports.service';
import type { CreateReportDto, UpdateReportDto, ReportQuery } from '../../../types/report.types';

export function useReports(query?: ReportQuery) {
  return useQuery({
    queryKey: ['reports', query],
    queryFn: () => reportsService.findAll(query),
  });
}

export function useReport(id: number | null) {
  return useQuery({
    queryKey: ['reports', id],
    queryFn: () => (id ? reportsService.findOne(id) : null),
    enabled: !!id,
  });
}

export function useCreateReport() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateReportDto) => reportsService.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reports'] });
    },
  });
}

export function useUpdateReport() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: UpdateReportDto }) =>
      reportsService.update(id, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['reports'] });
      queryClient.invalidateQueries({ queryKey: ['reports', variables.id] });
    },
  });
}

export function useDeleteReport() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: number) => reportsService.remove(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reports'] });
    },
  });
}

