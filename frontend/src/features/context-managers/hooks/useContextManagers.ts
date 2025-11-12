import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { contextManagersService } from '../../../api/services/context-managers.service';
import type {
  CreateContextManagerDto,
  UpdateContextManagerDto,
  ContextManagerQuery,
} from '../../../types/context-manager.types';

export function useContextManagers(contextId: number | null, query?: ContextManagerQuery) {
  return useQuery({
    queryKey: ['context-managers', contextId, query],
    queryFn: () => (contextId ? contextManagersService.findAllByContext(contextId, query) : null),
    enabled: !!contextId,
  });
}

export function useContextManager(contextId: number | null, id: number | null) {
  return useQuery({
    queryKey: ['context-managers', contextId, id],
    queryFn: () => (contextId && id ? contextManagersService.findOne(contextId, id) : null),
    enabled: !!contextId && !!id,
  });
}

export function useCreateContextManager() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ contextId, data }: { contextId: number; data: CreateContextManagerDto }) =>
      contextManagersService.create(contextId, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['context-managers', variables.contextId] });
    },
  });
}

export function useUpdateContextManager() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      contextId,
      id,
      data,
    }: {
      contextId: number;
      id: number;
      data: UpdateContextManagerDto;
    }) => contextManagersService.update(contextId, id, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['context-managers', variables.contextId] });
      queryClient.invalidateQueries({
        queryKey: ['context-managers', variables.contextId, variables.id],
      });
    },
  });
}

export function useDeleteContextManager() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ contextId, id }: { contextId: number; id: number }) =>
      contextManagersService.remove(contextId, id),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['context-managers', variables.contextId] });
    },
  });
}

