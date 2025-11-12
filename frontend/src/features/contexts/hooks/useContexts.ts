import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { contextsService } from '../../../api/services/contexts.service';
import type {
  CreateContextDto,
  UpdateContextDto,
  ContextQuery,
} from '../../../types/context.types';

export function useContexts(query?: ContextQuery) {
  return useQuery({
    queryKey: ['contexts', query],
    queryFn: () => contextsService.findAll(query),
  });
}

export function useContext(id: number | null) {
  return useQuery({
    queryKey: ['contexts', id],
    queryFn: () => (id ? contextsService.findOne(id) : null),
    enabled: !!id,
  });
}

export function useCreateContext() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateContextDto) => contextsService.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contexts'] });
    },
  });
}

export function useUpdateContext() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: UpdateContextDto }) =>
      contextsService.update(id, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['contexts'] });
      queryClient.invalidateQueries({ queryKey: ['contexts', variables.id] });
    },
  });
}

export function useDeleteContext() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: number) => contextsService.remove(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contexts'] });
    },
  });
}


