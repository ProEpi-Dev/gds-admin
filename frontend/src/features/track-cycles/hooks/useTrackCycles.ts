import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { TrackCyclesService } from '../../../api/services/track-cycles.service';
import type {
  CreateTrackCycleDto,
  UpdateTrackCycleDto,
  UpdateTrackCycleStatusDto,
  TrackCycleQueryParams,
} from '../../../types/track-cycle.types';

export function useTrackCycles(params?: TrackCycleQueryParams) {
  return useQuery({
    queryKey: ['track-cycles', params],
    queryFn: async () => {
      const response = await TrackCyclesService.list(params);
      return response.data;
    },
  });
}

export function useActiveTrackCycles(contextId?: number, trackId?: number) {
  return useQuery({
    queryKey: ['track-cycles', 'active', contextId, trackId],
    queryFn: async () => {
      const response = await TrackCyclesService.listActive(contextId, trackId);
      return response.data;
    },
  });
}

export function useTrackCycle(id: number | null) {
  return useQuery({
    queryKey: ['track-cycles', id],
    queryFn: async () => {
      if (!id) return null;
      const response = await TrackCyclesService.get(id);
      return response.data;
    },
    enabled: !!id,
  });
}

export function useCreateTrackCycle() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: CreateTrackCycleDto) => {
      const response = await TrackCyclesService.create(data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['track-cycles'] });
    },
  });
}

export function useUpdateTrackCycle() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, data }: { id: number; data: UpdateTrackCycleDto }) => {
      const response = await TrackCyclesService.update(id, data);
      return response.data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['track-cycles'] });
      queryClient.invalidateQueries({ queryKey: ['track-cycles', variables.id] });
    },
  });
}

export function useUpdateTrackCycleStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, data }: { id: number; data: UpdateTrackCycleStatusDto }) => {
      const response = await TrackCyclesService.updateStatus(id, data);
      return response.data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['track-cycles'] });
      queryClient.invalidateQueries({ queryKey: ['track-cycles', variables.id] });
    },
  });
}

export function useDeleteTrackCycle() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: number) => {
      const response = await TrackCyclesService.delete(id);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['track-cycles'] });
    },
  });
}

export function useStudentsProgress(cycleId: number | null) {
  return useQuery({
    queryKey: ['track-cycles', cycleId, 'students'],
    queryFn: async () => {
      if (!cycleId) return [];
      const response = await TrackCyclesService.getStudentsProgress(cycleId);
      return response.data;
    },
    enabled: !!cycleId,
  });
}
