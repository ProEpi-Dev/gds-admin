import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { formVersionsService } from '../../../api/services/form-versions.service';
import type {
  CreateFormVersionDto,
  UpdateFormVersionDto,
  FormVersionQuery,
} from '../../../types/form-version.types';

export function useFormVersions(formId: number | null, query?: FormVersionQuery) {
  return useQuery({
    queryKey: ['form-versions', formId, query],
    queryFn: () => (formId ? formVersionsService.findAllByForm(formId, query) : null),
    enabled: !!formId,
  });
}

export function useFormVersion(formId: number | null, id: number | null) {
  return useQuery({
    queryKey: ['form-versions', formId, id],
    queryFn: () => (formId && id ? formVersionsService.findOne(formId, id) : null),
    enabled: !!formId && !!id,
  });
}

export function useCreateFormVersion() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ formId, data }: { formId: number; data: CreateFormVersionDto }) =>
      formVersionsService.create(formId, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['form-versions', variables.formId] });
    },
  });
}

export function useUpdateFormVersion() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      formId,
      id,
      data,
    }: {
      formId: number;
      id: number;
      data: UpdateFormVersionDto;
    }) => formVersionsService.update(formId, id, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['form-versions', variables.formId] });
      queryClient.invalidateQueries({
        queryKey: ['form-versions', variables.formId, variables.id],
      });
    },
  });
}

export function useDeleteFormVersion() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ formId, id }: { formId: number; id: number }) =>
      formVersionsService.remove(formId, id),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['form-versions', variables.formId] });
    },
  });
}

