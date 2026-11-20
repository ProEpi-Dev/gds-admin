import { ConflictException, Injectable, Logger } from '@nestjs/common';

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
  /** Nome do autor, já extraído de `author_id` do integrador. */
  author?: string;
  /** ISO 8601 em UTC, já convertido de `date` do integrador. */
  createdAt?: string;
  [key: string]: any;
}

/**
 * O integrador devolve as mensagens no formato do Odoo (`mail.message`):
 * `{ id, body, author_id: { id, name }, date: "yyyy-MM-dd HH:mm:ss" }`, com a data em UTC.
 * Converte para `author` (nome) e `createdAt` (ISO 8601), mantendo esses campos
 * se já vierem prontos.
 */
export function normalizeEphemMessage(raw: Record<string, any>): EphemMessage {
  return {
    ...raw,
    id: raw.id,
    author: raw.author ?? authorName(raw.author_id),
    createdAt: raw.createdAt ?? odooDateToIso(raw.date),
    ...(typeof raw.body === 'string'
      ? { body: ephemHtmlToText(raw.body) }
      : {}),
    ...(typeof raw.message === 'string'
      ? { message: ephemHtmlToText(raw.message) }
      : {}),
  };
}

const HTML_ENTITIES: Record<string, string> = {
  amp: '&',
  lt: '<',
  gt: '>',
  quot: '"',
  apos: "'",
  nbsp: ' ',
};

/**
 * O corpo das mensagens do ePHEM (Odoo) é HTML; o app mostra texto puro.
 * - Menções a contatos no início (`<a href=".../res.partner/ID">@Nome</a>`) são removidas: no ePHEM 18
 *   a equipe começa a nota com "@GDS App" só para ela chegar ao GDS, e isso não diz nada ao cidadão.
 *   Menções no meio do texto ficam como "@Nome".
 * - Parágrafos, `<br>` e itens de lista viram quebras de linha; demais tags são removidas.
 * - Entidades (`&#64;`, `&amp;`, `&nbsp;`...) são decodificadas.
 */
export function ephemHtmlToText(html: string): string {
  return tidyLines(decodeHtmlEntities(stripHtmlTags(html)));
}

/** Tags de bloco cujo fechamento vira quebra de linha. */
const BLOCK_TAGS = new Set([
  'p',
  'div',
  'li',
  'h1',
  'h2',
  'h3',
  'h4',
  'h5',
  'h6',
  'blockquote',
  'tr',
]);

const MENTION_SEPARATORS = ' \t\n ,:';

/** Nome da tag em `<nome ...>` ou `</nome>`, em minúsculas. */
function tagName(tag: string): string {
  const inner = tag.startsWith('</') ? tag.slice(2) : tag.slice(1);
  let end = 0;
  while (end < inner.length && /[a-z0-9]/i.test(inner[end])) end++;
  return inner.slice(0, end).toLowerCase();
}

/** Texto que uma tag deixa no lugar: quebra de linha, marcador de lista ou nada. */
function tagReplacement(tag: string, name: string): string {
  const closing = tag.startsWith('</');
  if (name === 'br') return '\n';
  if (name === 'li' && !closing) return '- ';
  if (closing && BLOCK_TAGS.has(name)) return '\n';
  return '';
}

/** Posição logo depois de uma menção (`<a>...</a>` e a pontuação que a segue). */
function skipMention(html: string, from: number): number {
  const end = html.toLowerCase().indexOf('</a>', from);
  let i = end === -1 ? html.length : end + '</a>'.length;
  while (i < html.length && MENTION_SEPARATORS.includes(html[i])) i++;
  return i;
}

/**
 * Percorre o HTML tag a tag (indexOf, sem regex com retrocesso).
 * Enquanto ainda não há texto visível, menções a contatos (`<a ... res.partner ...>`) são puladas.
 */
function stripHtmlTags(html: string): string {
  let out = '';
  let hasText = false;
  let i = 0;
  while (i < html.length) {
    const open = html.indexOf('<', i);
    const close = open === -1 ? -1 : html.indexOf('>', open);
    if (close === -1) {
      out += html.slice(i);
      break;
    }
    const text = html.slice(i, open);
    out += text;
    hasText ||= text.trim().length > 0;
    const tag = html.slice(open, close + 1);
    const name = tagName(tag);
    const isMention =
      !hasText &&
      name === 'a' &&
      !tag.startsWith('</') &&
      tag.includes('res.partner');
    if (isMention) {
      i = skipMention(html, close + 1);
    } else {
      out += tagReplacement(tag, name);
      i = close + 1;
    }
  }
  return out;
}

function decodeHtmlEntities(text: string): string {
  return text.replaceAll(
    /&(#x[0-9a-f]+|#\d+|[a-z]+);/gi,
    (entity: string, code: string) => {
      if (!code.startsWith('#')) {
        return HTML_ENTITIES[code.toLowerCase()] ?? entity;
      }
      const isHex = code[1].toLowerCase() === 'x';
      const point = isHex
        ? Number.parseInt(code.slice(2), 16)
        : Number.parseInt(code.slice(1), 10);
      return Number.isFinite(point) && point > 0 && point <= 0x10ffff
        ? String.fromCodePoint(point)
        : entity;
    },
  );
}

/** Espaços repetidos viram um; no máximo uma linha em branco seguida. */
function tidyLines(text: string): string {
  return text
    .split('\n')
    .map((line) => line.replaceAll(/[ \t ]+/g, ' ').trim())
    .join('\n')
    .replaceAll(/\n{3,}/g, '\n\n')
    .trim();
}

function authorName(authorId: unknown): string | undefined {
  // integrador: { id, name }; XML-RPC cru do Odoo: [id, name]; sem autor: false/null
  if (Array.isArray(authorId) && typeof authorId[1] === 'string') {
    return authorId[1];
  }
  if (authorId && typeof authorId === 'object') {
    const name = (authorId as { name?: unknown }).name;
    if (typeof name === 'string' && name.trim().length > 0) return name;
  }
  return undefined;
}

function odooDateToIso(date: unknown): string | undefined {
  if (typeof date !== 'string') return undefined;
  const match = /^(\d{4}-\d{2}-\d{2})[ T](\d{2}:\d{2}:\d{2})$/.exec(
    date.trim(),
  );
  if (!match) return undefined;
  const iso = `${match[1]}T${match[2]}Z`;
  return Number.isNaN(Date.parse(iso)) ? undefined : iso;
}

/** Item de `GET .../signals` — `eventId` liga ao `external_event_id` gravado após o envio. */
export interface EphemSignal {
  eventId: string | number;
  dados?: Record<string, any>;
  [key: string]: any;
}

/**
 * Detalhe de `GET .../eventos/{id}` — reflete o desfecho assíncrono do processamento
 * no Ephem (`CRIADO` → `PROCESSADO`/`ERRO`), que não vem na resposta da criação.
 */
export interface EphemEventDetail {
  id: string | number;
  status?: string;
  statusMessage?: string;
  signalId?: number | null;
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

  /** Relê o evento no Ephem para obter o status assíncrono (`PROCESSADO`/`ERRO`) e o `signalId`. */
  async getEvent(
    config: EphemConfig,
    eventId: string,
  ): Promise<EphemEventDetail | null> {
    const url = `${config.baseUrl}/${API_PATH}/eventos/${eventId}`;
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
          `Ephem getEvent failed: HTTP ${response.status} – ${body}`,
        );
        return null;
      }

      const parsed: unknown = await response.json();
      if (!parsed || typeof parsed !== 'object') {
        return null;
      }
      return parsed as EphemEventDetail;
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
      return Array.isArray(list)
        ? list
            .filter(
              (m): m is Record<string, any> => !!m && typeof m === 'object',
            )
            .map(normalizeEphemMessage)
        : [];
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

      if (response.status === 409) {
        // o evento foi aceito pelo integrador, mas ainda não virou signal no ePHEM
        // (o processamento é assíncrono, a cada ~30s)
        throw new ConflictException(
          'O relato ainda está sendo enviado ao ePHEM. Tente novamente em instantes.',
        );
      }
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
