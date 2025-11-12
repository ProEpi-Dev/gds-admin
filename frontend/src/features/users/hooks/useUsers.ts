import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { usersService } from '../../../api/services/users.service';
import type { CreateUserDto, UpdateUserDto, UserQuery } from '../../../types/user.types';

export function useUsers(query?: UserQuery) {
  return useQuery({
    queryKey: ['users', query],
    queryFn: () => usersService.findAll(query),
  });
}

export function useUser(id: number | null) {
  return useQuery({
    queryKey: ['users', id],
    queryFn: () => (id ? usersService.findOne(id) : null),
    enabled: !!id,
  });
}

export function useCreateUser() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateUserDto) => usersService.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
    },
  });
}

export function useUpdateUser() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: UpdateUserDto }) =>
      usersService.update(id, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      queryClient.invalidateQueries({ queryKey: ['users', variables.id] });
    },
  });
}

export function useDeleteUser() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: number) => usersService.remove(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
    },
  });
}

