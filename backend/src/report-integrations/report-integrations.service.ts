import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { context_module_code } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { EphemClient, EphemEventPayload, EphemSignal } from './ephem.client';
import {
  IntegrationEventResponseDto,
  IntegrationMessageResponseDto,
} from './dto/integration-event-response.dto';
import { IntegrationConfigResponseDto } from './dto/integration-config-response.dto';
import { UpsertIntegrationConfigDto } from './dto/upsert-integration-config.dto';
import { IntegrationEventQueryDto } from './dto/integration-event-query.dto';
import { ListResponseDto } from '../common/dto/list-response.dto';
import {
  createPaginationMeta,
  createPaginationLinks,
} from '../common/helpers/pagination.helper';

const DEFAULT_TEMPLATE_ID = '/1';

/** Rótulos em aditionalData para os níveis do campo location (API legada usa chaves técnicas em data). */
const LOCATION_LEVEL_ADDITIONAL_LABELS = [
  'País',
  'Estado/Distrito',
  'Cidade/Concelho',
] as const;
const DEFAULT_ENVELOPE_MAPPING = {
  templateId: DEFAULT_TEMPLATE_ID,
  templateFieldKey: 'eventoIntegracaoTemplate',
  userIdFieldKey: 'userId',
  userEmailFieldKey: 'userEmail',
  userNameFieldKey: 'userName',
  userPhoneFieldKey: 'userPhone',
  userCountryFieldKey: 'userCountry',
  eventSourceIdFieldKey: 'eventSourceId',
  eventSourceLocationFieldKey: 'eventSourceLocation',
  eventSourceLocationIdFieldKey: 'eventSourceLocationId',
} as const;

type IntegrationEnvelopeMapping = {
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
};

type SignalFieldMeta = {
  label: string;
  options: Map<string, string>;
  type?: string;
  locationConfig?: {
    maxLevel?: 'COUNTRY' | 'STATE_DISTRICT' | 'CITY_COUNCIL';
    countryKey?: string;
    countryNameKey?: string;
    stateDistrictKey?: string;
    stateDistrictNameKey?: string;
    cityCouncilKey?: string;
    cityCouncilNameKey?: string;
  };
};

@Injectable()
export class ReportIntegrationsService {
  private readonly logger = new Logger(ReportIntegrationsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly ephemClient: EphemClient,
  ) {}

  /**
   * Acessores para modelos adicionados na V25 que só existem no Prisma Client
   * após `prisma generate`. O cast centralizado evita `as any` espalhado.
   */
  private get integrationEvent() {
    return (this.prisma as any).report_integration_event;
  }
  private get integrationMessage() {
    return (this.prisma as any).report_integration_message;
  }
  private get integrationConfig() {
    return (this.prisma as any).integration_config;
  }

  private resolveEnvelopeMapping(
    rawMapping: unknown,
  ): IntegrationEnvelopeMapping {
    const source =
      rawMapping && typeof rawMapping === 'object'
        ? (rawMapping as Record<string, unknown>)
        : {};

    const withFallback = <K extends keyof IntegrationEnvelopeMapping>(
      key: K,
    ): IntegrationEnvelopeMapping[K] => {
      const value = source[key];
      return typeof value === 'string' && value.trim().length > 0
        ? value
        : DEFAULT_ENVELOPE_MAPPING[key];
    };

    return {
      templateId: withFallback('templateId'),
      templateFieldKey: withFallback('templateFieldKey'),
      userIdFieldKey: withFallback('userIdFieldKey'),
      userEmailFieldKey: withFallback('userEmailFieldKey'),
      userNameFieldKey: withFallback('userNameFieldKey'),
      userPhoneFieldKey: withFallback('userPhoneFieldKey'),
      userCountryFieldKey: withFallback('userCountryFieldKey'),
      eventSourceIdFieldKey: withFallback('eventSourceIdFieldKey'),
      eventSourceLocationFieldKey: withFallback('eventSourceLocationFieldKey'),
      eventSourceLocationIdFieldKey: withFallback('eventSourceLocationIdFieldKey'),
    };
  }

  // ─── Elegibilidade ────────────────────────────────────────────

  async isEligibleForIntegration(reportId: number): Promise<boolean> {
    const report = await this.prisma.report.findUnique({
      where: { id: reportId },
      include: {
        participation: {
          include: {
            context: {
              include: { context_module: true },
            },
          },
        },
        form_version: {
          include: { form: true },
        },
      },
    });

    if (!report) return false;

    if (report.report_type === 'NEGATIVE') return false;

    if (report.form_version.form.type !== 'signal') return false;

    const hasCommunitySignal =
      report.participation.context.context_module.some(
        (m) => m.module_code === context_module_code.community_signal,
      );
    if (!hasCommunitySignal) return false;

    return true;
  }

  // ─── Envio do evento ──────────────────────────────────────────

  async dispatchIntegrationEvent(reportId: number): Promise<void> {
    const eligible = await this.isEligibleForIntegration(reportId);
    if (!eligible) {
      this.logger.debug(
        `Report ${reportId} não é elegível para integração externa`,
      );
      return;
    }

    const report = await this.prisma.report.findUnique({
      where: { id: reportId },
      include: {
        participation: {
          include: {
            user: true,
            context: true,
          },
        },
        form_version: {
          include: { form: true },
        },
      },
    });

    if (!report) return;

    const config = await this.getActiveConfig(
      report.participation.context_id,
    );

    if (!config) {
      this.logger.warn(
        `Nenhuma configuração de integração ativa para contexto ${report.participation.context_id}`,
      );
      return;
    }

    const isTraining =
      (report.participation as any).integration_training_mode;
    const environment = isTraining ? 'homologation' : 'production';
    const baseUrl = isTraining
      ? config.base_url_homologation
      : config.base_url_production;

    if (!baseUrl) {
      this.logger.warn(
        `URL de integração (${environment}) não configurada para contexto ${report.participation.context_id}`,
      );
      return;
    }

    const event = await this.integrationEvent.upsert({
      where: { report_id: reportId },
      create: {
        report_id: reportId,
        status: 'processing',
        environment,
      },
      update: {
        status: 'processing',
        attempt_count: { increment: 1 },
        last_attempt_at: new Date(),
        last_error: null,
      },
    });

    const envelopeMapping = this.resolveEnvelopeMapping(config.payload_mapping);
    const payload = await this.buildPayload(report, envelopeMapping);

    try {
      const authToken = (config.auth_config as any)?.token ?? '';
      const response = await this.ephemClient.createEvent(
        { baseUrl, authToken, timeoutMs: config.timeout_ms },
        payload,
      );

      await this.integrationEvent.update({
        where: { id: event.id },
        data: {
          status: 'sent',
          external_event_id: String(response.id),
          request_payload: payload as any,
          response_payload: response as any,
          last_attempt_at: new Date(),
        },
      });

      this.logger.log(
        `Integração enviada com sucesso: report=${reportId} externalId=${response.id}`,
      );
    } catch (error) {
      const err = error as Error;

      await this.integrationEvent.update({
        where: { id: event.id },
        data: {
          status: this.shouldRetry(event.attempt_count + 1, config.max_retries)
            ? 'pending'
            : 'failed',
          last_error: err.message,
          request_payload: payload as any,
          last_attempt_at: new Date(),
        },
      });

      this.logger.error(
        `Falha na integração: report=${reportId} attempt=${event.attempt_count + 1} error=${err.message}`,
      );
    }
  }

  private shouldRetry(
    currentAttempt: number,
    maxRetries: number,
  ): boolean {
    return currentAttempt < maxRetries;
  }

  private extractFieldMetaFromDefinition(
    definition: unknown,
  ): Record<string, SignalFieldMeta> {
    const map: Record<string, SignalFieldMeta> = {};
    if (!definition) return map;

    const parsed =
      typeof definition === 'string'
        ? (() => {
            try {
              return JSON.parse(definition);
            } catch {
              return null;
            }
          })()
        : definition;

    if (!parsed || typeof parsed !== 'object') return map;

    const candidates: any[] = [];
    const root = parsed as any;

    if (Array.isArray(root)) candidates.push(...root);
    if (Array.isArray(root.questions)) candidates.push(...root.questions);
    if (Array.isArray(root.fields)) candidates.push(...root.fields);

    for (const entry of candidates) {
      if (!entry || typeof entry !== 'object') continue;
      const field = entry.field ?? entry.name;
      const label = entry.text ?? entry.label ?? field;
      if (typeof field !== 'string' || typeof label !== 'string') continue;

      const options = new Map<string, string>();
      if (Array.isArray(entry.options)) {
        for (const option of entry.options) {
          const key = option?.value;
          const optionLabel = option?.label ?? option?.text;
          if (
            key !== undefined &&
            key !== null &&
            typeof optionLabel === 'string'
          ) {
            options.set(String(key), optionLabel);
          }
        }
      }

      map[field] = {
        label,
        options,
        type: typeof entry.type === 'string' ? entry.type : undefined,
        locationConfig:
          entry.locationConfig && typeof entry.locationConfig === 'object'
            ? {
                maxLevel:
                  entry.locationConfig.maxLevel === 'COUNTRY' ||
                  entry.locationConfig.maxLevel === 'STATE_DISTRICT' ||
                  entry.locationConfig.maxLevel === 'CITY_COUNCIL'
                    ? entry.locationConfig.maxLevel
                    : undefined,
                countryKey:
                  typeof entry.locationConfig.countryKey === 'string'
                    ? entry.locationConfig.countryKey
                    : undefined,
                countryNameKey:
                  typeof entry.locationConfig.countryNameKey === 'string'
                    ? entry.locationConfig.countryNameKey
                    : undefined,
                stateDistrictKey:
                  typeof entry.locationConfig.stateDistrictKey === 'string'
                    ? entry.locationConfig.stateDistrictKey
                    : undefined,
                stateDistrictNameKey:
                  typeof entry.locationConfig.stateDistrictNameKey === 'string'
                    ? entry.locationConfig.stateDistrictNameKey
                    : undefined,
                cityCouncilKey:
                  typeof entry.locationConfig.cityCouncilKey === 'string'
                    ? entry.locationConfig.cityCouncilKey
                    : undefined,
                cityCouncilNameKey:
                  typeof entry.locationConfig.cityCouncilNameKey === 'string'
                    ? entry.locationConfig.cityCouncilNameKey
                    : undefined,
              }
            : undefined,
      };
    }

    return map;
  }

  private mapFieldValueForIntegration(
    value: unknown,
    meta?: SignalFieldMeta,
  ): unknown {
    if (!meta || meta.options.size === 0) return value;

    if (Array.isArray(value)) {
      return value.map((item) => {
        const mapped = meta.options.get(String(item)) ?? item;
        return typeof mapped === 'string'
          ? this.normalizeUtf8MojibakeString(mapped)
          : mapped;
      });
    }

    if (value === null || value === undefined) return value;
    const mapped = meta.options.get(String(value)) ?? value;
    return typeof mapped === 'string'
      ? this.normalizeUtf8MojibakeString(mapped)
      : mapped;
  }

  /**
   * Texto que foi gravado como UTF-8 mas lido como Latin-1 vira padrão "sÃ£o" → "são".
   * Heurística: só tenta reparo se houver sequências típicas de mojibake.
   */
  private normalizeUtf8MojibakeString(text: string): string {
    if (!text.includes('Ã') && !text.includes('Â')) {
      return text;
    }
    try {
      const repaired = Buffer.from(text, 'latin1').toString('utf8');
      if (repaired.includes('\uFFFD')) {
        return text;
      }
      return repaired;
    } catch {
      return text;
    }
  }

  /** Multiselect vira string separada por vírgulas (evita JSON array no payload). */
  private formatValueForIntegrationPayload(
    value: unknown,
    meta?: SignalFieldMeta,
  ): unknown {
    if (meta?.type === 'multiselect' && Array.isArray(value)) {
      const parts = value
        .map((item) =>
          item === null || item === undefined ? '' : String(item).trim(),
        )
        .filter((s) => s.length > 0);
      return parts.join(', ');
    }
    if (
      meta?.type === 'date' &&
      value !== null &&
      value !== undefined &&
      value !== ''
    ) {
      return this.formatDateForIntegrationPayload(value);
    }
    if (meta?.type === 'mapPoint' && value !== null && value !== undefined) {
      return this.formatMapPointForIntegrationPayload(value);
    }
    return value;
  }

  /**
   * Integrador espera string; o formulário grava { latitude, longitude }.
   */
  private formatMapPointForIntegrationPayload(value: unknown): string {
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      const o = value as Record<string, unknown>;
      const latRaw = o.latitude;
      const lngRaw = o.longitude;
      const lat = typeof latRaw === 'number' ? latRaw : Number(latRaw);
      const lng = typeof lngRaw === 'number' ? lngRaw : Number(lngRaw);
      if (Number.isFinite(lat) && Number.isFinite(lng)) {
        return `${lat.toFixed(6)}, ${lng.toFixed(6)}`;
      }
    }
    if (typeof value === 'string') {
      return value.trim();
    }
    return '';
  }

  /**
   * Integrador Ephem espera datas no formato dd-MM-yyyy (formulário costuma gravar yyyy-MM-dd).
   */
  private formatDateForIntegrationPayload(value: unknown): string {
    const raw = String(value).trim();
    const isoDay = /^(\d{4})-(\d{2})-(\d{2})/.exec(raw);
    if (isoDay) {
      const [, y, m, d] = isoDay;
      return `${d}-${m}-${y}`;
    }
    const alreadyDdMmYyyy = /^(\d{2})-(\d{2})-(\d{4})$/.exec(raw);
    if (alreadyDdMmYyyy) {
      return raw;
    }
    const t = Date.parse(raw);
    if (!Number.isNaN(t)) {
      const dt = new Date(t);
      const dd = String(dt.getUTCDate()).padStart(2, '0');
      const mm = String(dt.getUTCMonth() + 1).padStart(2, '0');
      const yyyy = String(dt.getUTCFullYear());
      return `${dd}-${mm}-${yyyy}`;
    }
    return raw;
  }

  private locationLevelAdditionalLabel(levelIndex: number): string {
    return (
      LOCATION_LEVEL_ADDITIONAL_LABELS[levelIndex] ??
      `Nível ${levelIndex + 1}`
    );
  }

  private normalizeFormResponseEntries(
    formResponse: unknown,
  ): Array<{ field: string; value: unknown }> {
    if (!formResponse) return [];

    if (Array.isArray(formResponse)) {
      return formResponse
        .map((entry: any) => ({
          field: String(entry?.field ?? ''),
          value: entry?.value,
        }))
        .filter((entry) => entry.field.length > 0);
    }

    if (typeof formResponse !== 'object') return [];

    const responseObj = formResponse as Record<string, unknown>;
    const answers = responseObj.answers;

    if (Array.isArray(answers)) {
      return answers
        .map((entry: any) => ({
          field: String(entry?.field ?? ''),
          value: entry?.value,
        }))
        .filter((entry) => entry.field.length > 0);
    }

    // Formato já persistido como objeto chave->valor.
    return Object.entries(responseObj)
      .filter(
        ([key, value]) =>
          key !== '_isValid' &&
          value !== null &&
          value !== undefined &&
          value !== '',
      )
      .map(([field, value]) => ({ field, value }));
  }

  private getLocationLevelMappings(meta?: SignalFieldMeta): Array<{
    idKey: string;
    nameKey?: string;
  }> {
    const config = meta?.locationConfig;
    if (!config) return [];

    const mappings: Array<{ idKey: string; nameKey?: string }> = [];
    if (config.countryKey) {
      mappings.push({ idKey: config.countryKey, nameKey: config.countryNameKey });
    }
    if (config.stateDistrictKey) {
      mappings.push({
        idKey: config.stateDistrictKey,
        nameKey: config.stateDistrictNameKey,
      });
    }
    if (config.cityCouncilKey) {
      mappings.push({
        idKey: config.cityCouncilKey,
        nameKey: config.cityCouncilNameKey,
      });
    }
    return mappings;
  }

  private isNonEmptyString(value: unknown): value is string {
    return typeof value === 'string' && value.trim().length > 0;
  }

  private extractLocationIdsRequiringLookup(
    entries: Array<{ field: string; value: unknown }>,
    metaMap: Record<string, SignalFieldMeta>,
  ): number[] {
    const ids = new Set<number>();

    for (const entry of entries) {
      const meta = metaMap[entry.field];
      if (meta?.type !== 'location') continue;
      if (!entry.value || typeof entry.value !== 'object') continue;

      const valueObj = entry.value as Record<string, unknown>;
      const levelMappings = this.getLocationLevelMappings(meta);

      if (levelMappings.length === 0) {
        // Compatibilidade com formulários antigos sem configuração de nome.
        for (const rawValue of Object.values(valueObj)) {
          const parsed = Number(rawValue);
          if (Number.isInteger(parsed) && parsed > 0) {
            ids.add(parsed);
          }
        }
        continue;
      }

      for (const mapping of levelMappings) {
        const rawId = valueObj[mapping.idKey];
        const parsedId = Number(rawId);
        const rawName = mapping.nameKey ? valueObj[mapping.nameKey] : undefined;
        if (
          Number.isInteger(parsedId) &&
          parsedId > 0 &&
          !this.isNonEmptyString(rawName)
        ) {
          ids.add(parsedId);
        }
      }
    }

    return Array.from(ids);
  }

  private async resolveLocationNamesByIds(
    ids: number[],
  ): Promise<Map<number, string>> {
    if (ids.length === 0) {
      return new Map<number, string>();
    }

    const locations = await this.prisma.location.findMany({
      where: { id: { in: ids } },
      select: { id: true, name: true },
    });

    return new Map<number, string>(
      locations.map((location: any) => [location.id, String(location.name)]),
    );
  }

  private mapLocationValueToName(
    value: unknown,
    locationNamesById: Map<number, string>,
  ): unknown {
    const parsed = Number(value);
    if (!Number.isInteger(parsed) || parsed <= 0) {
      return value;
    }
    return locationNamesById.get(parsed) ?? value;
  }

  private async buildPayload(
    report: any,
    envelopeMapping: IntegrationEnvelopeMapping,
  ): Promise<EphemEventPayload> {
    const user = report.participation.user;
    const formResponse = report.form_response;
    const userCountryName = await this.resolveUserCountryName(user);
    const fieldMetaMap = this.extractFieldMetaFromDefinition(
      report?.form_version?.definition,
    );
    const entries = this.normalizeFormResponseEntries(formResponse);
    const locationIds = this.extractLocationIdsRequiringLookup(
      entries,
      fieldMetaMap,
    );
    const locationNamesById = await this.resolveLocationNamesByIds(locationIds);

    const dataMap: Record<string, unknown> = {};
    const additionalDataMap: Record<string, unknown> = {};

    for (const entry of entries) {
      const meta = fieldMetaMap[entry.field];

      if (
        meta?.type === 'location' &&
        entry.value &&
        typeof entry.value === 'object' &&
        !Array.isArray(entry.value)
      ) {
        const locationObj = entry.value as Record<string, unknown>;
        const levelMappings = this.getLocationLevelMappings(meta);

        if (levelMappings.length === 0) {
          for (const [locationKey, rawValue] of Object.entries(locationObj)) {
            const resolvedValue = this.mapLocationValueToName(
              rawValue,
              locationNamesById,
            );
            const outVal =
              typeof resolvedValue === 'string'
                ? this.normalizeUtf8MojibakeString(resolvedValue)
                : resolvedValue;
            dataMap[locationKey] = outVal;
            additionalDataMap[locationKey] = outVal;
          }
          continue;
        }

        for (let i = 0; i < levelMappings.length; i++) {
          const mapping = levelMappings[i];
          const rawId = locationObj[mapping.idKey];
          if (rawId === undefined || rawId === null || rawId === '') continue;

          const resolvedFromResponse = mapping.nameKey
            ? locationObj[mapping.nameKey]
            : undefined;
          const resolvedValue = this.isNonEmptyString(resolvedFromResponse)
            ? resolvedFromResponse
            : this.mapLocationValueToName(rawId, locationNamesById);
          const outVal =
            typeof resolvedValue === 'string'
              ? this.normalizeUtf8MojibakeString(String(resolvedValue))
              : resolvedValue;
          // Valor é sempre nome: em data usar a chave de nome do formulário quando existir
          // (evita chaves *_id com valor textual).
          const dataPayloadKey =
            mapping.nameKey && mapping.nameKey.trim().length > 0
              ? mapping.nameKey
              : mapping.idKey;
          dataMap[dataPayloadKey] = outVal;
          additionalDataMap[this.locationLevelAdditionalLabel(i)] = outVal;
        }
        continue;
      }

      const mapped = this.mapFieldValueForIntegration(entry.value, meta);
      let formatted = this.formatValueForIntegrationPayload(mapped, meta);
      if (typeof formatted === 'string') {
        formatted = this.normalizeUtf8MojibakeString(formatted);
      }
      dataMap[entry.field] = formatted;
      const additionalKey = this.normalizeUtf8MojibakeString(
        meta?.label ?? entry.field,
      );
      additionalDataMap[additionalKey] = formatted;
    }

    return {
      [envelopeMapping.templateFieldKey]: envelopeMapping.templateId,
      [envelopeMapping.userIdFieldKey]: user.id,
      [envelopeMapping.userEmailFieldKey]: user.email,
      [envelopeMapping.userNameFieldKey]: user.name,
      [envelopeMapping.userPhoneFieldKey]: user.phone ?? null,
      [envelopeMapping.userCountryFieldKey]: userCountryName,
      [envelopeMapping.eventSourceIdFieldKey]: report.id,
      [envelopeMapping.eventSourceLocationFieldKey]: '',
      [envelopeMapping.eventSourceLocationIdFieldKey]: 0,
      data: dataMap,
      aditionalData: additionalDataMap,
    } as EphemEventPayload;
  }

  private async resolveUserCountryName(user: any): Promise<string | null> {
    const explicitCountryLocationId = (user as any).country_location_id;
    if (explicitCountryLocationId) {
      const countryLocation = await this.prisma.location.findUnique({
        where: { id: explicitCountryLocationId },
        select: { name: true },
      });
      return countryLocation ? String((countryLocation as any).name) : null;
    }

    let currentId: number | null = user.location_id ?? null;
    const visited = new Set<number>();
    while (currentId && !visited.has(currentId)) {
      visited.add(currentId);
      const currentLocation = await this.prisma.location.findUnique({
        where: { id: currentId },
        select: {
          id: true,
          name: true,
          parent_id: true,
          org_level: true,
        } as any,
      });

      if (!currentLocation) {
        break;
      }

      if ((currentLocation as any).org_level === 'COUNTRY') {
        return String((currentLocation as any).name);
      }

      currentId = (currentLocation as any).parent_id ?? null;
    }

    return null;
  }

  // ─── Retry manual (admin) ────────────────────────────────────

  async retryIntegration(eventId: number): Promise<IntegrationEventResponseDto> {
    const event = await this.integrationEvent.findUnique({
      where: { id: eventId },
    });

    if (!event) {
      throw new NotFoundException(
        `Evento de integração com ID ${eventId} não encontrado`,
      );
    }

    if (event.status !== 'failed' && event.status !== 'pending') {
      throw new BadRequestException(
        'Somente eventos com status "failed" ou "pending" podem ser reenviados',
      );
    }

    await this.integrationEvent.update({
      where: { id: eventId },
      data: { status: 'pending', last_error: null },
    });

    await this.dispatchIntegrationEvent(event.report_id);

    const updated = await this.integrationEvent.findUnique({
      where: { id: eventId },
      include: { messages: true },
    });

    return this.mapEventToDto(updated!);
  }

  // ─── Sincronização de mensagens ──────────────────────────────

  async syncMessages(eventId: number): Promise<IntegrationMessageResponseDto[]> {
    const event = await this.integrationEvent.findUnique({
      where: { id: eventId },
      include: {
        report: {
          include: {
            participation: {
              include: { context: true },
            },
          },
        },
      },
    });

    if (!event) {
      throw new NotFoundException(
        `Evento de integração com ID ${eventId} não encontrado`,
      );
    }

    if (!event.external_event_id) {
      return [];
    }

    const config = await this.getActiveConfig(
      event.report.participation.context_id,
    );
    if (!config) return [];

    const isTraining =
      event.environment === 'homologation';
    const baseUrl = isTraining
      ? config.base_url_homologation
      : config.base_url_production;
    if (!baseUrl) return [];

    const authToken = (config.auth_config as any)?.token ?? '';

    const remoteMessages = await this.ephemClient.getMessages(
      { baseUrl, authToken, timeoutMs: config.timeout_ms },
      event.external_event_id,
    );

    for (const msg of remoteMessages) {
      const externalId = String(msg.id);
      await this.integrationMessage.upsert({
        where: {
          integration_event_id_external_message_id: {
            integration_event_id: eventId,
            external_message_id: externalId,
          },
        },
        create: {
          integration_event_id: eventId,
          external_message_id: externalId,
          direction: 'inbound',
          body: msg.message ?? msg.body ?? '',
          author: msg.author ?? null,
          remote_created_at: msg.createdAt
            ? new Date(msg.createdAt)
            : null,
        },
        update: {
          body: msg.message ?? msg.body ?? '',
          author: msg.author ?? null,
        },
      });
    }

    const allMessages =
      await this.integrationMessage.findMany({
        where: { integration_event_id: eventId },
        orderBy: { created_at: 'asc' },
      });

    return allMessages.map((m) => this.mapMessageToDto(m));
  }

  async sendMessage(
    eventId: number,
    message: string,
  ): Promise<IntegrationMessageResponseDto> {
    const event = await this.integrationEvent.findUnique({
      where: { id: eventId },
      include: {
        report: {
          include: {
            participation: {
              include: { context: true },
            },
          },
        },
      },
    });

    if (!event) {
      throw new NotFoundException(
        `Evento de integração com ID ${eventId} não encontrado`,
      );
    }

    if (!event.external_event_id) {
      throw new BadRequestException(
        'Não é possível enviar mensagem: evento ainda não foi integrado',
      );
    }

    const config = await this.getActiveConfig(
      event.report.participation.context_id,
    );
    if (!config) {
      throw new BadRequestException(
        'Configuração de integração não encontrada',
      );
    }

    const isTraining = event.environment === 'homologation';
    const baseUrl = isTraining
      ? config.base_url_homologation
      : config.base_url_production;
    if (!baseUrl) {
      throw new BadRequestException(
        `URL de integração (${event.environment}) não configurada`,
      );
    }

    const authToken = (config.auth_config as any)?.token ?? '';

    const response = await this.ephemClient.sendMessage(
      { baseUrl, authToken, timeoutMs: config.timeout_ms },
      event.external_event_id,
      message,
    );

    const saved = await this.integrationMessage.create({
      data: {
        integration_event_id: eventId,
        external_message_id: response?.id ? String(response.id) : null,
        direction: 'outbound',
        body: message,
      },
    });

    return this.mapMessageToDto(saved);
  }

  // ─── Consultas ────────────────────────────────────────────────

  async findEventByReportId(
    reportId: number,
  ): Promise<IntegrationEventResponseDto | null> {
    const event = await this.integrationEvent.findUnique({
      where: { report_id: reportId },
      include: {
        messages: { orderBy: { created_at: 'asc' } },
        report: {
          select: {
            participation: {
              select: {
                context_id: true,
                user_id: true,
                integration_training_mode: true,
              },
            },
          },
        },
      },
    });

    if (!event) return null;

    const participation = event.report?.participation;
    let stage: { id: number; label: string } | null = null;
    if (participation && event.external_event_id) {
      const index = await this.fetchEphemSignalStageIndexByUser(
        participation.context_id,
        participation.user_id,
        participation.integration_training_mode ?? false,
      );
      stage = index.get(String(event.external_event_id)) ?? null;
    }

    return this.mapEventToDto(event, stage);
  }

  /**
   * Lista eventos de integração dos reports da participação.
   * Só retorna dados se a participação pertencer ao usuário autenticado.
   */
  async findEventsByParticipationForUser(
    participationId: number,
    userId: number,
  ): Promise<IntegrationEventResponseDto[]> {
    const participation = await this.prisma.participation.findFirst({
      where: { id: participationId, user_id: userId },
      select: {
        id: true,
        context_id: true,
        user_id: true,
        integration_training_mode: true,
      },
    });
    if (!participation) {
      throw new ForbiddenException(
        'Participação inválida ou sem permissão para acessar estes dados',
      );
    }

    const events = await this.integrationEvent.findMany({
      where: { report: { participation_id: participationId } },
      orderBy: { created_at: 'desc' },
    });

    const stageIndex = await this.fetchEphemSignalStageIndexByUser(
      participation.context_id,
      participation.user_id,
      participation.integration_training_mode ?? false,
    );

    return events.map((e) =>
      this.mapEventToDto(
        e,
        e.external_event_id
          ? (stageIndex.get(String(e.external_event_id)) ?? null)
          : null,
      ),
    );
  }

  async findEvents(
    query: IntegrationEventQueryDto,
  ): Promise<ListResponseDto<IntegrationEventResponseDto>> {
    const page = query.page || 1;
    const pageSize = query.pageSize || 20;
    const skip = (page - 1) * pageSize;

    const where: any = {};

    if (query.status) {
      where.status = query.status;
    }

    if (query.contextId) {
      where.report = {
        participation: { context_id: query.contextId },
      };
    }

    const [events, totalItems] = await Promise.all([
      this.integrationEvent.findMany({
        where,
        skip,
        take: pageSize,
        orderBy: { created_at: 'desc' },
        include: { messages: { orderBy: { created_at: 'asc' } } },
      }),
      this.integrationEvent.count({ where }),
    ]);

    const baseUrl = '/v1/report-integrations';
    const queryParams: Record<string, any> = {};
    if (query.status) queryParams.status = query.status;
    if (query.contextId) queryParams.contextId = query.contextId;

    return {
      data: events.map((e) => this.mapEventToDto(e)),
      meta: createPaginationMeta({
        page,
        pageSize,
        totalItems,
        baseUrl,
        queryParams,
      }),
      links: createPaginationLinks({
        page,
        pageSize,
        totalItems,
        baseUrl,
        queryParams,
      }),
    };
  }

  // ─── Configuração de integração ──────────────────────────────

  async getActiveConfig(contextId: number) {
    return this.integrationConfig.findFirst({
      where: { context_id: contextId, is_active: true },
      orderBy: { version: 'desc' },
    });
  }

  async getConfigByContext(
    contextId: number,
  ): Promise<IntegrationConfigResponseDto | null> {
    const config = await this.getActiveConfig(contextId);
    return config ? this.mapConfigToDto(config) : null;
  }

  async upsertConfig(
    contextId: number,
    dto: UpsertIntegrationConfigDto,
  ): Promise<IntegrationConfigResponseDto> {
    const existing = await this.getActiveConfig(contextId);

    if (existing) {
      await this.integrationConfig.update({
        where: { id: existing.id },
        data: { is_active: false },
      });
    }

    const newVersion = (existing?.version ?? 0) + 1;

    const existingEnvelopeMapping = this.resolveEnvelopeMapping(
      existing?.payload_mapping,
    );
    const envelopeMapping: IntegrationEnvelopeMapping = {
      templateId: dto.templateId ?? existingEnvelopeMapping.templateId,
      templateFieldKey:
        dto.templateFieldKey ?? existingEnvelopeMapping.templateFieldKey,
      userIdFieldKey:
        dto.userIdFieldKey ?? existingEnvelopeMapping.userIdFieldKey,
      userEmailFieldKey:
        dto.userEmailFieldKey ?? existingEnvelopeMapping.userEmailFieldKey,
      userNameFieldKey:
        dto.userNameFieldKey ?? existingEnvelopeMapping.userNameFieldKey,
      userPhoneFieldKey:
        dto.userPhoneFieldKey ?? existingEnvelopeMapping.userPhoneFieldKey,
      userCountryFieldKey:
        dto.userCountryFieldKey ?? existingEnvelopeMapping.userCountryFieldKey,
      eventSourceIdFieldKey:
        dto.eventSourceIdFieldKey ??
        existingEnvelopeMapping.eventSourceIdFieldKey,
      eventSourceLocationFieldKey:
        dto.eventSourceLocationFieldKey ??
        existingEnvelopeMapping.eventSourceLocationFieldKey,
      eventSourceLocationIdFieldKey:
        dto.eventSourceLocationIdFieldKey ??
        existingEnvelopeMapping.eventSourceLocationIdFieldKey,
    };

    const created = await this.integrationConfig.create({
      data: {
        context_id: contextId,
        version: newVersion,
        is_active: dto.isActive ?? true,
        base_url_production: dto.baseUrlProduction ?? null,
        base_url_homologation: dto.baseUrlHomologation ?? null,
        auth_config: dto.authConfig ?? existing?.auth_config ?? null,
        payload_mapping: envelopeMapping,
        timeout_ms: dto.timeoutMs ?? 30000,
        max_retries: dto.maxRetries ?? 3,
      },
    });

    return this.mapConfigToDto(created);
  }

  // ─── Ephem: estágio do sinal (API legada / listSignals) ───────

  /** Formato Ephem: `signal_stage_state_id: [id, "Rótulo"]`. */
  private parseEphemSignalStageState(
    raw: unknown,
  ): { id: number; label: string } | null {
    if (!Array.isArray(raw) || raw.length < 2) return null;
    const id = Number(raw[0]);
    const label = String(raw[1] ?? '').trim();
    if (!Number.isFinite(id) || !label) return null;
    return { id, label };
  }

  private buildEphemStageIndexFromSignals(
    signals: EphemSignal[],
  ): Map<string, { id: number; label: string }> {
    const map = new Map<string, { id: number; label: string }>();
    for (const s of signals) {
      if (s == null || typeof s !== 'object') continue;
      if (s.eventId === undefined || s.eventId === null) continue;
      const key = String(s.eventId);
      const dados = s.dados as Record<string, unknown> | undefined;
      const stage = this.parseEphemSignalStageState(
        dados?.signal_stage_state_id,
      );
      if (stage) map.set(key, stage);
    }
    return map;
  }

  /**
   * Índice `externalEventId` → estágio, via `GET .../signals` (mesmo userId da Ephem).
   */
  private async fetchEphemSignalStageIndexByUser(
    contextId: number,
    ephemUserId: number,
    integrationTrainingMode: boolean,
  ): Promise<Map<string, { id: number; label: string }>> {
    const config = await this.getActiveConfig(contextId);
    if (!config) return new Map();

    const baseUrl = integrationTrainingMode
      ? config.base_url_homologation
      : config.base_url_production;
    if (!baseUrl || !String(baseUrl).trim()) return new Map();

    const authToken = (config.auth_config as any)?.token ?? '';
    try {
      const signals = await this.ephemClient.listSignals(
        {
          baseUrl: String(baseUrl).replace(/\/$/, ''),
          authToken,
          timeoutMs: config.timeout_ms ?? 30000,
        },
        ephemUserId,
      );
      return this.buildEphemStageIndexFromSignals(signals);
    } catch (err: any) {
      this.logger.warn(
        { err: err?.message, contextId, ephemUserId },
        'Ephem listSignals falhou ao obter estágio do sinal',
      );
      return new Map();
    }
  }

  // ─── Mappers ──────────────────────────────────────────────────

  private mapEventToDto(
    event: any,
    externalSignalStage?: { id: number; label: string } | null,
  ): IntegrationEventResponseDto {
    const stage =
      externalSignalStage === undefined ? null : externalSignalStage;
    return {
      id: event.id,
      reportId: event.report_id,
      externalEventId: event.external_event_id,
      status: event.status,
      environment: event.environment,
      attemptCount: event.attempt_count,
      lastAttemptAt: event.last_attempt_at,
      lastError: event.last_error,
      externalSignalStageId: stage?.id ?? null,
      externalSignalStageLabel: stage?.label ?? null,
      createdAt: event.created_at,
      updatedAt: event.updated_at,
      messages: event.messages?.map((m: any) => this.mapMessageToDto(m)),
    };
  }

  private mapMessageToDto(msg: any): IntegrationMessageResponseDto {
    return {
      id: msg.id,
      externalMessageId: msg.external_message_id,
      direction: msg.direction,
      body: msg.body,
      author: msg.author,
      remoteCreatedAt: msg.remote_created_at,
      createdAt: msg.created_at,
    };
  }

  private mapConfigToDto(config: any): IntegrationConfigResponseDto {
    const envelopeMapping = this.resolveEnvelopeMapping(config.payload_mapping);
    const authDisplay = config.auth_config
      ? { type: (config.auth_config as any).type ?? 'unknown', hasToken: !!(config.auth_config as any).token }
      : null;

    return {
      id: config.id,
      contextId: config.context_id,
      version: config.version,
      isActive: config.is_active,
      baseUrlProduction: config.base_url_production,
      baseUrlHomologation: config.base_url_homologation,
      authConfig: authDisplay,
      templateId: envelopeMapping.templateId,
      templateFieldKey: envelopeMapping.templateFieldKey,
      userIdFieldKey: envelopeMapping.userIdFieldKey,
      userEmailFieldKey: envelopeMapping.userEmailFieldKey,
      userNameFieldKey: envelopeMapping.userNameFieldKey,
      userPhoneFieldKey: envelopeMapping.userPhoneFieldKey,
      userCountryFieldKey: envelopeMapping.userCountryFieldKey,
      eventSourceIdFieldKey: envelopeMapping.eventSourceIdFieldKey,
      eventSourceLocationFieldKey: envelopeMapping.eventSourceLocationFieldKey,
      eventSourceLocationIdFieldKey:
        envelopeMapping.eventSourceLocationIdFieldKey,
      timeoutMs: config.timeout_ms,
      maxRetries: config.max_retries,
      createdAt: config.created_at,
      updatedAt: config.updated_at,
    };
  }
}
