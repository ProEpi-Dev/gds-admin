import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { usersService } from '../../../api/services/users.service';
import type { UserQuery, CreateUserDto } from '../../../types/user.types';

export function useAdmins(query?: UserQuery) {
  return useQuery({
    queryKey: ['users', 'admins', query],
    queryFn: () => usersService.findAdmins(query ?? {}),
  });
}

/** Cria um novo usuário já como administrador (sem participações). Apenas admin. */
export function useCreateAdmin() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateUserDto & { roleId: number }) =>
      usersService.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users', 'admins'] });
      queryClient.invalidateQueries({ queryKey: ['users'] });
    },
  });
}

export function useRemoveAdmin() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (userId: number) =>
      usersService.update(userId, { roleId: null }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users', 'admins'] });
      queryClient.invalidateQueries({ queryKey: ['users'] });
    },
  });
}
