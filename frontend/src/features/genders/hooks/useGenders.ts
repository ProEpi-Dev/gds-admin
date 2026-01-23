import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { gendersService } from '../../../api/services/genders.service';
import type {
  CreateGenderDto,
  UpdateGenderDto,
  GenderQuery,
} from '../../../types/gender.types';

export function useGenders(query?: GenderQuery) {
  return useQuery({
    queryKey: ['genders', query],
    queryFn: () => gendersService.findAll(query),
  });
}

export function useGender(id: number | null) {
  return useQuery({
    queryKey: ['genders', id],
    queryFn: () => (id ? gendersService.findOne(id) : null),
    enabled: !!id,
  });
}

export function useCreateGender() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateGenderDto) => gendersService.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['genders'] });
    },
  });
}

export function useUpdateGender() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: UpdateGenderDto }) =>
      gendersService.update(id, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['genders'] });
      queryClient.invalidateQueries({ queryKey: ['genders', variables.id] });
    },
  });
}

export function useDeleteGender() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: number) => gendersService.remove(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['genders'] });
    },
  });
}
