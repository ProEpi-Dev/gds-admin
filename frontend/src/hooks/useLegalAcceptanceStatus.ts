import { useQuery } from '@tanstack/react-query';
import { usersService } from '../api/services/users.service';
import type { LegalAcceptanceStatusResponse } from '../types/user.types';

export function useLegalAcceptanceStatus() {
  const { data, isLoading, error, refetch } = useQuery<LegalAcceptanceStatusResponse>({
    queryKey: ['legal-acceptance-status'],
    queryFn: () => usersService.getLegalAcceptanceStatus(),
    staleTime: 5 * 60 * 1000, // Cache por 5 minutos
    retry: 1,
  });

  return {
    needsAcceptance: data?.needsAcceptance ?? false,
    pendingDocuments: data?.pendingDocuments ?? [],
    acceptedDocuments: data?.acceptedDocuments ?? [],
    isLoading,
    error,
    refetch,
  };
}
