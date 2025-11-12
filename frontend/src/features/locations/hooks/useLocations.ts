import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { locationsService } from '../../../api/services/locations.service';
import type { CreateLocationDto, UpdateLocationDto, LocationQuery } from '../../../types/location.types';

export function useLocations(query?: LocationQuery) {
  return useQuery({
    queryKey: ['locations', query],
    queryFn: () => locationsService.findAll(query),
  });
}

export function useLocation(id: number | null) {
  return useQuery({
    queryKey: ['locations', id],
    queryFn: () => (id ? locationsService.findOne(id) : null),
    enabled: !!id,
  });
}

export function useCreateLocation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateLocationDto) => locationsService.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['locations'] });
    },
  });
}

export function useUpdateLocation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: UpdateLocationDto }) =>
      locationsService.update(id, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['locations'] });
      queryClient.invalidateQueries({ queryKey: ['locations', variables.id] });
    },
  });
}

export function useDeleteLocation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: number) => locationsService.remove(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['locations'] });
    },
  });
}

