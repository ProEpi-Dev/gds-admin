import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { formsService } from '../../../api/services/forms.service';
import type { CreateFormDto, UpdateFormDto, FormQuery } from '../../../types/form.types';

export function useForms(query?: FormQuery) {
  return useQuery({
    queryKey: ['forms', query],
    queryFn: () => formsService.findAll(query),
  });
}

export function useForm(id: number | null) {
  return useQuery({
    queryKey: ['forms', id],
    queryFn: () => (id ? formsService.findOne(id) : null),
    enabled: !!id,
  });
}

export function useCreateForm() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateFormDto) => formsService.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['forms'] });
    },
  });
}

export function useUpdateForm() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: UpdateFormDto }) =>
      formsService.update(id, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['forms'] });
      queryClient.invalidateQueries({ queryKey: ['forms', variables.id] });
    },
  });
}

export function useDeleteForm() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: number) => formsService.remove(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['forms'] });
    },
  });
}

