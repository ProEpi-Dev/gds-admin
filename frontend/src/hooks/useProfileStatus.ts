import { useQuery } from '@tanstack/react-query';
import { usersService } from '../api/services/users.service';
import type {
  ProfileFieldRequirements,
  ProfileStatusResponse,
} from '../types/user.types';

const defaultProfileFieldRequirements: ProfileFieldRequirements = {
  gender: true,
  country: false,
  location: true,
  externalIdentifier: true,
  phone: false,
};

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
    profile: data?.profile ?? {
      genderId: null,
      locationId: null,
      countryLocationId: null,
      externalIdentifier: null,
      phone: null,
    },
    profileFieldRequirements:
      data?.profileFieldRequirements ?? defaultProfileFieldRequirements,
    profileExtraRequired: data?.profileExtraRequired ?? false,
    profileExtraComplete: data?.profileExtraComplete ?? true,
    isLoading,
    error,
    refetch,
  };
}
