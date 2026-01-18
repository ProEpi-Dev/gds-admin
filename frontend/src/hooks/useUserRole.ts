import { useQuery } from '@tanstack/react-query';
import { usersService } from '../api/services/users.service';
import type { UserRoleResponse } from '../types/user.types';

export function useUserRole() {
  const { data, isLoading, error } = useQuery<UserRoleResponse>({
    queryKey: ['user-role'],
    queryFn: () => usersService.getUserRole(),
    staleTime: 5 * 60 * 1000, // Cache por 5 minutos
    retry: 1,
  });

  return {
    isManager: data?.isManager ?? false,
    isParticipant: data?.isParticipant ?? false,
    contexts: data?.contexts ?? { asManager: [], asParticipant: [] },
    isLoading,
    error,
  };
}
