import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { participationsService } from '../../../api/services/participations.service';
import type { CreateParticipationDto, UpdateParticipationDto, ParticipationQuery } from '../../../types/participation.types';

export function useParticipations(query?: ParticipationQuery) {
  return useQuery({
    queryKey: ['participations', query],
    queryFn: () => participationsService.findAll(query),
  });
}

export function useParticipation(id: number | null) {
  return useQuery({
    queryKey: ['participations', id],
    queryFn: () => (id ? participationsService.findOne(id) : null),
    enabled: !!id,
  });
}

export function useCreateParticipation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateParticipationDto) => participationsService.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['participations'] });
    },
  });
}

export function useUpdateParticipation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: UpdateParticipationDto }) =>
      participationsService.update(id, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['participations'] });
      queryClient.invalidateQueries({ queryKey: ['participations', variables.id] });
    },
  });
}

export function useDeleteParticipation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: number) => participationsService.remove(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['participations'] });
    },
  });
}

