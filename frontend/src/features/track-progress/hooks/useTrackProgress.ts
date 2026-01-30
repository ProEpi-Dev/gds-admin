import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { TrackProgressService } from '../../../api/services/track-progress.service';
import type {
  StartTrackProgressDto,
  UpdateSequenceProgressDto,
  TrackProgressQueryParams,
  TrackExecutionsQueryParams,
} from '../../../types/track-progress.types';

export function useStartTrackProgress() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: StartTrackProgressDto) => TrackProgressService.start(data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['track-cycles', variables.trackCycleId, 'students'] });
      queryClient.invalidateQueries({ queryKey: ['track-progress'] });
    },
  });
}

export function useTrackProgressByParticipationAndCycle(
  participationId: number | null,
  cycleId: number | null,
) {
  return useQuery({
    queryKey: ['track-progress', participationId, cycleId],
    queryFn: async () => {
      if (!participationId || !cycleId) return null;
      const response = await TrackProgressService.getByParticipationAndCycle(
        participationId,
        cycleId,
      );
      return response.data;
    },
    enabled: !!participationId && !!cycleId,
  });
}

export function useTrackProgressList(params?: TrackProgressQueryParams) {
  return useQuery({
    queryKey: ['track-progress', params],
    queryFn: async () => {
      const response = await TrackProgressService.list(params);
      return response.data;
    },
  });
}

export function useTrackExecutions(params?: TrackExecutionsQueryParams) {
  return useQuery({
    queryKey: ['track-progress', 'executions', params],
    queryFn: async () => {
      const response = await TrackProgressService.getExecutions(params);
      return response.data;
    },
  });
}

export function useCanAccessSequence(trackProgressId: number | null, sequenceId: number | null) {
  return useQuery({
    queryKey: ['track-progress', trackProgressId, 'can-access', sequenceId],
    queryFn: async () => {
      if (!trackProgressId || !sequenceId) return { canAccess: false, reason: '' };
      const response = await TrackProgressService.canAccessSequence(trackProgressId, sequenceId);
      return response.data;
    },
    enabled: !!trackProgressId && !!sequenceId,
  });
}

export function useUpdateSequenceProgress(trackProgressId: number, sequenceId: number) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: UpdateSequenceProgressDto) =>
      TrackProgressService.updateSequenceProgress(trackProgressId, sequenceId, data),
    onSuccess: (_, __, context) => {
      queryClient.invalidateQueries({ queryKey: ['track-progress'] });
    },
  });
}

export function useCompleteContent(trackProgressId: number, sequenceId: number) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () =>
      TrackProgressService.completeContent(trackProgressId, sequenceId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['track-progress'] });
    },
  });
}

export function useCompleteQuiz(
  trackProgressId: number,
  sequenceId: number,
) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (quizSubmissionId: number) =>
      TrackProgressService.completeQuiz(trackProgressId, sequenceId, quizSubmissionId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['track-progress'] });
    },
  });
}

export function useRecalculateTrackProgress(trackProgressId: number) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => TrackProgressService.recalculate(trackProgressId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['track-progress'] });
    },
  });
}
