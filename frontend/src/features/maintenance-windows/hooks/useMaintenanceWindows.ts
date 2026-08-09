import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { maintenanceWindowsService } from '../../../api/services/maintenance-windows.service';
import type {
  CreateMaintenanceWindowDto,
  UpdateMaintenanceWindowDto,
  MaintenanceWindowQuery,
} from '../../../types/maintenance-window.types';

/**
 * Estado da janela em vigor, para o banner global.
 *
 * Precisa de polling: uma janela pode começar (ou ser desligada) enquanto a
 * pessoa está com o console aberto, e no modo `banner` nenhuma requisição falha
 * para denunciar isso.
 */
export function useMaintenanceStatus() {
  return useQuery({
    queryKey: ['maintenance-status'],
    queryFn: () => maintenanceWindowsService.current(),
    refetchInterval: 60_000,
    refetchOnWindowFocus: true,
    // Falhar aqui não pode quebrar o layout: sem resposta, apenas não há banner.
    retry: false,
  });
}

export function useMaintenanceWindows(query?: MaintenanceWindowQuery) {
  return useQuery({
    queryKey: ['maintenance-windows', query],
    queryFn: () => maintenanceWindowsService.findAll(query),
  });
}

export function useMaintenanceWindow(id: number | null) {
  return useQuery({
    queryKey: ['maintenance-windows', id],
    queryFn: () => (id ? maintenanceWindowsService.findOne(id) : null),
    enabled: !!id,
  });
}

export function useCreateMaintenanceWindow() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateMaintenanceWindowDto) =>
      maintenanceWindowsService.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['maintenance-windows'] });
    },
  });
}

export function useUpdateMaintenanceWindow() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      id,
      data,
    }: {
      id: number;
      data: UpdateMaintenanceWindowDto;
    }) => maintenanceWindowsService.update(id, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['maintenance-windows'] });
      queryClient.invalidateQueries({
        queryKey: ['maintenance-windows', variables.id],
      });
    },
  });
}

export function useDeleteMaintenanceWindow() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: number) => maintenanceWindowsService.remove(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['maintenance-windows'] });
    },
  });
}
