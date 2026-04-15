import { Injectable, Logger } from '@nestjs/common';

export interface EphemEventPayload extends Record<string, any> {
  data: Record<string, any>;
  aditionalData: Record<string, any>;
}

export interface EphemEventResponse {
  id: string;
  [key: string]: any;
}

export interface EphemMessage {
  id: string;
  message?: string;
  body?: string;
  author?: string;
  createdAt?: string;
  [key: string]: any;
}

/** Item de `GET .../signals` — `eventId` liga ao `external_event_id` gravado após o envio. */
export interface EphemSignal {
  eventId: string | number;
  dados?: Record<string, any>;
  [key: string]: any;
}

interface EphemConfig {
  baseUrl: string;
  authToken?: string;
  timeoutMs: number;
}

const API_PATH = 'api-integracao/v1';

@Injectable()
export class EphemClient {
  private readonly logger = new Logger(EphemClient.name);

  private buildHeaders(authToken?: string): Record<string, string> {
    const headers: Record<string, string> = {
      Accept: 'application/json; charset=utf-8',
      'Content-Type': 'application/json; charset=utf-8',
    };
    if (authToken) {
      headers['Authorization'] = authToken;
    }
    return headers;
  }

  async createEvent(
    config: EphemConfig,
    payload: EphemEventPayload,
  ): Promise<EphemEventResponse> {
    const url = `${config.baseUrl}/${API_PATH}/eventos`;
    const controller = new AbortController();
    const timeout = setTimeout(
      () => controller.abort(),
      config.timeoutMs,
    );

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: this.buildHeaders(config.authToken),
        body: JSON.stringify(payload),
        signal: controller.signal,
      });

      if (!response.ok) {
        const body = await response.text().catch(() => '');
        throw new Error(
          `Ephem createEvent failed: HTTP ${response.status} – ${body}`,
        );
      }

      return (await response.json()) as EphemEventResponse;
    } finally {
      clearTimeout(timeout);
    }
  }

  async getMessages(
    config: EphemConfig,
    eventId: string,
    page = 0,
    size = 99,
  ): Promise<EphemMessage[]> {
    const url = `${config.baseUrl}/${API_PATH}/eventos/${eventId}/mensagens?page=${page}&size=${size}`;
    const controller = new AbortController();
    const timeout = setTimeout(
      () => controller.abort(),
      config.timeoutMs,
    );

    try {
      const response = await fetch(url, {
        method: 'GET',
        headers: this.buildHeaders(config.authToken),
        signal: controller.signal,
      });

      if (!response.ok) {
        const body = await response.text().catch(() => '');
        this.logger.error(
          `Ephem getMessages failed: HTTP ${response.status} – ${body}`,
        );
        return [];
      }

      const parsed: unknown = await response.json();
      if (!parsed || typeof parsed !== 'object') {
        return [];
      }
      const embedded = (parsed as { _embedded?: { mensagens?: unknown } })
        ._embedded;
      const list = embedded?.mensagens;
      return Array.isArray(list) ? list : [];
    } finally {
      clearTimeout(timeout);
    }
  }

  async sendMessage(
    config: EphemConfig,
    eventId: string,
    message: string,
  ): Promise<any> {
    const url = `${config.baseUrl}/${API_PATH}/eventos/${eventId}/mensagens`;
    const controller = new AbortController();
    const timeout = setTimeout(
      () => controller.abort(),
      config.timeoutMs,
    );

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: this.buildHeaders(config.authToken),
        body: JSON.stringify({ message }),
        signal: controller.signal,
      });

      if (!response.ok) {
        const body = await response.text().catch(() => '');
        throw new Error(
          `Ephem sendMessage failed: HTTP ${response.status} – ${body}`,
        );
      }

      return await response.json();
    } finally {
      clearTimeout(timeout);
    }
  }

  async listSignals(
    config: EphemConfig,
    userId: number,
    page = 0,
    size = 999,
  ): Promise<EphemSignal[]> {
    // API legada (Ruby) usava `user_id`; alguns ambientes aceitam `userId`.
    const url = `${config.baseUrl}/${API_PATH}/signals?page=${page}&size=${size}&userId=${userId}&user_id=${userId}`;
    const controller = new AbortController();
    const timeout = setTimeout(
      () => controller.abort(),
      config.timeoutMs,
    );

    try {
      const response = await fetch(url, {
        method: 'GET',
        headers: this.buildHeaders(config.authToken),
        signal: controller.signal,
      });

      if (!response.ok) {
        this.logger.error(
          `Ephem listSignals failed: HTTP ${response.status}`,
        );
        return [];
      }

      const parsed: unknown = await response.json();
      if (!parsed || typeof parsed !== 'object') {
        return [];
      }
      const embedded = (parsed as { _embedded?: { signals?: unknown } })
        ._embedded;
      const list = embedded?.signals;
      return Array.isArray(list) ? list : [];
    } finally {
      clearTimeout(timeout);
    }
  }
}
