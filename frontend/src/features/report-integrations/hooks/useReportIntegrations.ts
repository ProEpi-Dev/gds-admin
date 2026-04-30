import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  reportIntegrationsService,
  type IntegrationEventQuery,
  type UpsertIntegrationConfigDto,
} from '../../../api/services/report-integrations.service';
import { useSnackbar } from '../../../hooks/useSnackbar';
import { getErrorMessage } from '../../../utils/errorHandler';

export function useIntegrationEvents(query: IntegrationEventQuery) {
  return useQuery({
    queryKey: ['integration-events', query],
    queryFn: () => reportIntegrationsService.findEvents(query),
  });
}

export function useIntegrationEventByReport(reportId: number | null) {
  return useQuery({
    queryKey: ['integration-event-by-report', reportId],
    queryFn: () => reportIntegrationsService.findEventByReport(reportId!),
    enabled: !!reportId,
  });
}

export function useIntegrationEventsByParticipation(
  participationId: number | null,
) {
  return useQuery({
    queryKey: ['integration-events-by-participation', participationId],
    queryFn: () =>
      reportIntegrationsService.findEventsByParticipation(participationId!),
    enabled: !!participationId,
    staleTime: 30_000,
  });
}

export function useRetryIntegration() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (eventId: number) =>
      reportIntegrationsService.retryIntegration(eventId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['integration-events'] });
    },
  });
}

export function useIntegrationMessages(eventId: number | null) {
  return useQuery({
    queryKey: ['integration-messages', eventId],
    queryFn: () => reportIntegrationsService.getMessages(eventId!),
    enabled: !!eventId,
  });
}

export function useSendIntegrationMessage() {
  const queryClient = useQueryClient();
  const { showError } = useSnackbar();
  return useMutation({
    mutationFn: ({ eventId, message }: { eventId: number; message: string }) =>
      reportIntegrationsService.sendMessage(eventId, message),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({
        queryKey: ['integration-messages', variables.eventId],
      });
      queryClient.invalidateQueries({
        queryKey: ['integration-events-by-participation'],
      });
      queryClient.invalidateQueries({ queryKey: ['app-signals-list'] });
    },
    onError: (error) => {
      const detail = getErrorMessage(
        error,
        'Não foi possível enviar a mensagem.',
      );
      const generic =
        /^internal server error$/i.test(detail.trim()) ||
        /^request failed with status code 5\d\d$/i.test(detail.trim());
      showError(
        generic
          ? 'Não foi possível enviar a mensagem. Tente novamente em instantes.'
          : detail,
      );
    },
  });
}

export function useIntegrationConfig(contextId: number | null) {
  return useQuery({
    queryKey: ['integration-config', contextId],
    queryFn: () => reportIntegrationsService.getConfig(contextId!),
    enabled: !!contextId,
  });
}

export function useUpsertIntegrationConfig() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      contextId,
      dto,
    }: {
      contextId: number;
      dto: UpsertIntegrationConfigDto;
    }) => reportIntegrationsService.upsertConfig(contextId, dto),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({
        queryKey: ['integration-config', variables.contextId],
      });
    },
  });
}
