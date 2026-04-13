import api from '../client';
import type { ListResponse } from '../../types/api.types';

export interface IntegrationMessage {
  id: number;
  externalMessageId: string | null;
  direction: 'inbound' | 'outbound';
  body: string;
  author: string | null;
  remoteCreatedAt: string | null;
  createdAt: string;
}

export interface IntegrationEvent {
  id: number;
  reportId: number;
  externalEventId: string | null;
  status: 'pending' | 'processing' | 'sent' | 'failed';
  environment: string;
  attemptCount: number;
  lastAttemptAt: string | null;
  lastError: string | null;
  /** Estágio na Ephem (`signal_stage_state_id`), quando listSignals retorna dados. */
  externalSignalStageId?: number | null;
  externalSignalStageLabel?: string | null;
  createdAt: string;
  updatedAt: string;
  messages?: IntegrationMessage[];
}

export interface IntegrationConfig {
  id: number;
  contextId: number;
  version: number;
  isActive: boolean;
  baseUrlProduction: string | null;
  baseUrlHomologation: string | null;
  authConfig: Record<string, any> | null;
  templateId: string;
  templateFieldKey: string;
  userIdFieldKey: string;
  userEmailFieldKey: string;
  userNameFieldKey: string;
  userPhoneFieldKey: string;
  userCountryFieldKey: string;
  eventSourceIdFieldKey: string;
  eventSourceLocationFieldKey: string;
  eventSourceLocationIdFieldKey: string;
  timeoutMs: number;
  maxRetries: number;
  createdAt: string;
  updatedAt: string;
}

export interface IntegrationEventQuery {
  page?: number;
  pageSize?: number;
  status?: string;
  contextId?: number;
}

export interface UpsertIntegrationConfigDto {
  baseUrlProduction?: string;
  baseUrlHomologation?: string;
  authConfig?: Record<string, any>;
  templateId?: string;
  templateFieldKey?: string;
  userIdFieldKey?: string;
  userEmailFieldKey?: string;
  userNameFieldKey?: string;
  userPhoneFieldKey?: string;
  userCountryFieldKey?: string;
  eventSourceIdFieldKey?: string;
  eventSourceLocationFieldKey?: string;
  eventSourceLocationIdFieldKey?: string;
  timeoutMs?: number;
  maxRetries?: number;
  isActive?: boolean;
}

/** baseURL do axios já inclui `/v1` (ver `API_BASE_URL`). */
const BASE_URL = '/report-integrations';

export const reportIntegrationsService = {
  findEvents: async (
    query: IntegrationEventQuery,
  ): Promise<ListResponse<IntegrationEvent>> => {
    const { data } = await api.get(BASE_URL, { params: query });
    return data;
  },

  findEventByReport: async (
    reportId: number,
  ): Promise<IntegrationEvent | null> => {
    const { data } = await api.get(`${BASE_URL}/by-report/${reportId}`);
    return data;
  },

  findEventsByParticipation: async (
    participationId: number,
  ): Promise<IntegrationEvent[]> => {
    const { data } = await api.get(
      `${BASE_URL}/by-participation/${participationId}`,
    );
    return data;
  },

  retryIntegration: async (
    eventId: number,
  ): Promise<IntegrationEvent> => {
    const { data } = await api.post(`${BASE_URL}/${eventId}/retry`);
    return data;
  },

  getMessages: async (
    eventId: number,
  ): Promise<IntegrationMessage[]> => {
    const { data } = await api.get(`${BASE_URL}/${eventId}/messages`);
    return data;
  },

  sendMessage: async (
    eventId: number,
    message: string,
  ): Promise<IntegrationMessage> => {
    const { data } = await api.post(`${BASE_URL}/${eventId}/messages`, {
      message,
    });
    return data;
  },

  getConfig: async (
    contextId: number,
  ): Promise<IntegrationConfig | null> => {
    const { data } = await api.get(`${BASE_URL}/config/${contextId}`);
    return data;
  },

  upsertConfig: async (
    contextId: number,
    dto: UpsertIntegrationConfigDto,
  ): Promise<IntegrationConfig> => {
    const { data } = await api.put(`${BASE_URL}/config/${contextId}`, dto);
    return data;
  },
};
