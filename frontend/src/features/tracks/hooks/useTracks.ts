import { useQuery } from '@tanstack/react-query';
import { TrackService } from '../../../api/services/track.service';

export function useTracks(contextId?: number) {
  return useQuery({
    queryKey: ['tracks', contextId],
    queryFn: async () => {
      const response = await TrackService.list(contextId ? { contextId } : undefined);
      return response.data;
    },
    enabled: contextId !== undefined && contextId > 0,
  });
}

export function useAllTracks() {
  return useQuery({
    queryKey: ['tracks'],
    queryFn: async () => {
      const response = await TrackService.list();
      return response.data;
    },
  });
}
