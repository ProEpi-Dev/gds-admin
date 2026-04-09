import { useQuery } from '@tanstack/react-query';
import { usersService } from '../api/services/users.service';
import type { ProfileStatusResponse } from '../types/user.types';

export function useProfileStatus(enabled = true) {
  const { data, isLoading, error, refetch } = useQuery<ProfileStatusResponse>({
    queryKey: ['profile-status'],
    queryFn: () => usersService.getProfileStatus(),
    staleTime: 2 * 60 * 1000, // Cache por 2 minutos
    retry: 1,
    enabled, // Só executa a query se enabled for true
  });

  return {
    isComplete: data?.isComplete ?? false,
    missingFields: data?.missingFields ?? [],
    profile: data?.profile ?? { genderId: null, locationId: null, externalIdentifier: null },
    profileExtraRequired: data?.profileExtraRequired ?? false,
    profileExtraComplete: data?.profileExtraComplete ?? true,
    isLoading,
    error,
    refetch,
  };
}
