import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { Prisma, report_type_enum } from '@prisma/client';
import { randomUUID } from 'node:crypto';
import { toDate } from 'date-fns-tz';
import { AuthzService } from '../authz/authz.service';
import { ListResponseDto } from '../common/dto/list-response.dto';
import {
  createPaginationLinks,
  createPaginationMeta,
} from '../common/helpers/pagination.helper';
import {
  AuditLogService,
  AuditRequestContext,
} from '../audit-log/audit-log.service';
import { PrismaService } from '../prisma/prisma.service';
import { BusinessMetricsService } from '../telemetry/business-metrics.service';
import {
  CreateFormSymptomMappingDto,
  CreateSyndromeDto,
  CreateSyndromeFormConfigDto,
  CreateSyndromeWeightDto,
  CreateSymptomDto,
  DailySyndromeCountsQueryDto,
  ReprocessSyndromicClassificationDto,
  ReportSyndromeScoresQueryDto,
  ReportSyndromeScoreResponseDto,
  UpdateFormSymptomMappingDto,
  UpdateSyndromeDto,
  UpdateSyndromeFormConfigDto,
  UpdateSyndromeWeightDto,
  UpdateSymptomDto,
  UpsertSyndromeWeightMatrixDto,
} from './dto/syndromic-classification.dto';

type AuditMeta = Record<string, unknown>;

@Injectable()
export class SyndromicClassificationService {
  private readonly logger = new Logger(SyndromicClassificationService.name);
  private static readonly PROCESSING_VERSION = 'v1-weighted';
  private static readonly REPORT_DAY_TZ = 'America/Sao_Paulo';

  private static toDecimalNumberOrNull(value: unknown): number | null {
    if (value === null || value === undefined) {
      return null;
    }
    return Number(value);
  }

  private static symptomScalarToStrings(value: unknown): string[] {
    if (Array.isArray(value)) {
      return value
        .map((item) => String(item ?? '').trim())
        .filter((item) => item.length > 0);
    }
    if (value === null || value === undefined) {
      return [];
    }
    if (typeof value === 'object') {
      try {
        const json = JSON.stringify(value);
        return json.length > 0 ? [json] : [];
      } catch {
        return [];
      }
    }
    return [String(value).trim()].filter((item) => item.length > 0);
  }

  /**
   * Interpreta `startDate`/`endDate` (YYYY-MM-DD) como dias civis em {@link REPORT_DAY_TZ}
   * e retorna o intervalo em UTC para filtrar `timestamptz` (ex.: `report.created_at`).
   * Evita o bug de usar meia-noite UTC, que desloca o fim do dia em relação ao Brasil.
   */
  private static reportCalendarDayRangeUtc(
    startDate: string,
    endDate: string,
  ): { startUtc: Date; endInclusiveUtc: Date } {
    const timeZone = SyndromicClassificationService.REPORT_DAY_TZ;
    return {
      startUtc: toDate(`${startDate}T00:00:00`, { timeZone }),
      endInclusiveUtc: toDate(`${endDate}T23:59:59.999`, { timeZone }),
    };
  }

  constructor(
    private readonly prisma: PrismaService,
    private readonly authz: AuthzService,
    private readonly auditLogService: AuditLogService,
    private readonly businessMetrics: BusinessMetricsService,
  ) {}

  private get symptomModel() {
    return (this.prisma as any).symptom;
  }

  private get syndromeModel() {
    return (this.prisma as any).syndrome;
  }

  private get syndromeSymptomWeightModel() {
    return (this.prisma as any).syndrome_symptom_weight;
  }

  private get syndromeFormConfigModel() {
    return (this.prisma as any).syndrome_form_config;
  }

  private get formSymptomMappingModel() {
    return (this.prisma as any).form_symptom_mapping;
  }

  private get reportSyndromeScoreModel() {
    return (this.prisma as any).report_syndrome_score;
  }

  triggerClassification(reportId: number): void {
    this.classifyReport(reportId).catch((error: Error) => {
      this.logger.error(
        {
          reportId,
          errMessage: error?.message,
        },
        'Falha no processamento assíncrono da classificação sindrômica',
      );
    });
  }

  async classifyReport(reportId: number): Promise<void> {
    const startedAt = Date.now();
    const report = await this.prisma.report.findUnique({
      where: { id: reportId },
      include: {
        form_version: { select: { id: true, form_id: true } },
      },
    });

    if (!report) {
      this.logger.warn(
        { reportId },
        'Report não encontrado para classificação sindrômica',
      );
      return;
    }

    if (report.report_type !== report_type_enum.POSITIVE) {
      await this.persistStatusSnapshot(report.id, 'skipped', {
        processingError: 'Report não elegível: apenas POSITIVE na V1',
      });
      this.businessMetrics.recordSyndromeClassification('skipped');
      return;
    }

    const formId = report.form_version.form_id;
    const config = await this.syndromeFormConfigModel.findFirst({
      where: {
        form_id: formId,
        active: true,
      },
    });

    if (!config) {
      await this.reportSyndromeScoreModel.deleteMany({
        where: { report_id: report.id },
      });
      this.logger.debug(
        { reportId, formId },
        'Classificação sindrômica ignorada: formulário sem configuração ativa',
      );
      this.businessMetrics.recordSyndromeClassification('skipped');
      return;
    }

    try {
      const extractedSymptomValues = this.extractSymptomValuesFromResponse(
        report.form_response,
        config,
      );

      const mappedSymptoms = await this.resolveMappedSymptoms(
        config.id,
        extractedSymptomValues,
      );

      const mappedSymptomIds = Array.from(
        new Set(mappedSymptoms.map((item: any) => item.symptom_id)),
      );

      const syndromes = await this.syndromeModel.findMany({
        where: { active: true },
      });

      const weights = await this.syndromeSymptomWeightModel.findMany({
        where: {
          active: true,
          syndrome: { active: true },
        },
      });

      const weightsBySyndrome = new Map<number, any[]>();
      for (const weight of weights) {
        const list = weightsBySyndrome.get(weight.syndrome_id) ?? [];
        list.push(weight);
        weightsBySyndrome.set(weight.syndrome_id, list);
      }

      await this.prisma.$transaction(async (tx) => {
        // Remove snapshots anteriores deste report (reprocessamento = só o último cálculo na tabela).
        await (tx as any).report_syndrome_score.deleteMany({
          where: { report_id: report.id },
        });

        const rows: any[] = [];
        for (const syndrome of syndromes) {
          const syndromeWeights = weightsBySyndrome.get(syndrome.id) ?? [];
          const totalWeightSum = syndromeWeights.reduce(
            (acc, item) => acc + Number(item.weight),
            0,
          );
          const matchedWeights = syndromeWeights.filter((item) =>
            mappedSymptomIds.includes(item.symptom_id),
          );
          const presentWeightSum = matchedWeights.reduce(
            (acc, item) => acc + Number(item.weight),
            0,
          );
          const score = totalWeightSum > 0 ? presentWeightSum / totalWeightSum : 0;
          const thresholdScore = Number(syndrome.threshold_score ?? 0);
          const isAboveThreshold = score >= thresholdScore;

          rows.push({
            report_id: report.id,
            syndrome_id: syndrome.id,
            score,
            threshold_score_snapshot: thresholdScore,
            is_above_threshold: isAboveThreshold,
            present_weight_sum: presentWeightSum,
            total_weight_sum: totalWeightSum,
            matched_symptom_ids: matchedWeights.map((item) => item.symptom_id),
            processing_version: SyndromicClassificationService.PROCESSING_VERSION,
            processing_status: 'processed',
            processing_error: null,
            is_latest: true,
            processed_at: new Date(),
          });

          this.businessMetrics.recordSyndromeScoreGenerated(
            String(syndrome.code),
            isAboveThreshold,
          );
        }

        if (rows.length === 0) {
          rows.push({
            report_id: report.id,
            syndrome_id: null,
            score: null,
            threshold_score_snapshot: null,
            is_above_threshold: null,
            present_weight_sum: null,
            total_weight_sum: null,
            matched_symptom_ids: mappedSymptomIds,
            processing_version: SyndromicClassificationService.PROCESSING_VERSION,
            processing_status: 'skipped',
            processing_error: 'Sem síndromes ativas para cálculo',
            is_latest: true,
            processed_at: new Date(),
          });
        }

        await (tx as any).report_syndrome_score.createMany({ data: rows });
      });

      this.businessMetrics.recordSyndromeClassification('processed');
      this.businessMetrics.recordSyndromeClassificationDuration(
        Date.now() - startedAt,
      );
    } catch (error) {
      const err = error as Error;
      await this.persistStatusSnapshot(report.id, 'failed', {
        processingError: err?.message ?? 'Erro desconhecido no cálculo',
      });
      this.businessMetrics.recordSyndromeClassification('failed');
      this.logger.error(
        {
          reportId,
          errMessage: err?.message,
        },
        'Erro ao classificar report',
      );
    }
  }

  private async persistStatusSnapshot(
    reportId: number,
    status: 'processed' | 'skipped' | 'failed',
    options?: { processingError?: string | null },
  ): Promise<void> {
    await this.prisma.$transaction(async (tx) => {
      await (tx as any).report_syndrome_score.deleteMany({
        where: { report_id: reportId },
      });
      await (tx as any).report_syndrome_score.create({
        data: {
          report_id: reportId,
          syndrome_id: null,
          score: null,
          threshold_score_snapshot: null,
          is_above_threshold: null,
          present_weight_sum: null,
          total_weight_sum: null,
          matched_symptom_ids: [],
          processing_version: SyndromicClassificationService.PROCESSING_VERSION,
          processing_status: status,
          processing_error: options?.processingError ?? null,
          is_latest: true,
          processed_at: new Date(),
        },
      });
    });
  }

  private normalizeResponseEntries(
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

    return Object.entries(responseObj)
      .filter(([key]) => key !== '_isValid')
      .map(([field, value]) => ({ field, value }));
  }

  private extractSymptomValuesFromResponse(
    formResponse: unknown,
    config: any,
  ): string[] {
    const entries = this.normalizeResponseEntries(formResponse);
    const selectorById = config?.symptoms_field_id
      ? String(config.symptoms_field_id)
      : null;
    const selectorByName = config?.symptoms_field_name
      ? String(config.symptoms_field_name)
      : null;

    const selected = entries.find((entry) => {
      if (selectorById && entry.field === selectorById) return true;
      if (selectorByName && entry.field === selectorByName) return true;
      return false;
    });

    if (!selected) return [];

    return SyndromicClassificationService.symptomScalarToStrings(selected.value);
  }

  /**
   * Resolve sintomas canônicos a partir dos valores brutos do formulário.
   * 1) Usa `form_symptom_mapping` quando existir (obrigatório se o app gravar rótulos diferentes do `symptom.code`).
   * 2) Fallback: valor idêntico a `symptom.code` (caso típico GdS: multiselect grava códigos estáveis).
   */
  private async resolveMappedSymptoms(
    syndromeFormConfigId: number,
    formValues: string[],
  ): Promise<Array<{ symptom_id: number }>> {
    if (formValues.length === 0) return [];

    const uniqueValues = Array.from(new Set(formValues.map((v) => String(v ?? '').trim()).filter((v) => v.length > 0)));
    if (uniqueValues.length === 0) return [];

    const mappingRows = await this.formSymptomMappingModel.findMany({
      where: {
        syndrome_form_config_id: syndromeFormConfigId,
        active: true,
        form_option_value: { in: uniqueValues },
      },
      select: {
        symptom_id: true,
        form_option_value: true,
      },
    });

    const covered = new Set(mappingRows.map((r: any) => r.form_option_value));
    const uncovered = uniqueValues.filter((v) => !covered.has(v));

    let fallbackRows: Array<{ symptom_id: number }> = [];
    if (uncovered.length > 0) {
      const byCode = await this.symptomModel.findMany({
        where: {
          active: true,
          code: { in: uncovered },
        },
        select: { id: true },
      });
      fallbackRows = byCode.map((s: any) => ({ symptom_id: s.id }));
    }

    const merged: Array<{ symptom_id: number }> = [
      ...mappingRows.map((r: any) => ({ symptom_id: r.symptom_id })),
      ...fallbackRows,
    ];

    const seen = new Set<number>();
    return merged.filter((row) => {
      if (seen.has(row.symptom_id)) return false;
      seen.add(row.symptom_id);
      return true;
    });
  }

  async getReportLatestScores(
    reportId: number,
    userId: number,
  ): Promise<ReportSyndromeScoreResponseDto[]> {
    const report = await this.prisma.report.findUnique({
      where: { id: reportId },
      include: {
        participation: {
          select: {
            context_id: true,
            user_id: true,
          },
        },
      },
    });
    if (!report) {
      throw new NotFoundException(`Report com ID ${reportId} não encontrado`);
    }

    await this.assertCanReadReportScores(userId, report.participation);

    const rows = await this.reportSyndromeScoreModel.findMany({
      where: {
        report_id: reportId,
        is_latest: true,
      },
      include: {
        syndrome: true,
      },
      orderBy: [{ score: 'desc' }, { id: 'desc' }],
    });

    return rows.map((row: any) => ({
      id: row.id,
      reportId: row.report_id,
      syndromeId: row.syndrome_id ?? null,
      syndromeCode: row.syndrome?.code ?? null,
      syndromeName: row.syndrome?.name ?? null,
      score: SyndromicClassificationService.toDecimalNumberOrNull(row.score),
      thresholdScore: SyndromicClassificationService.toDecimalNumberOrNull(
        row.threshold_score_snapshot,
      ),
      isAboveThreshold: row.is_above_threshold ?? null,
      processingStatus: row.processing_status,
      processingError: row.processing_error ?? null,
      processedAt: row.processed_at,
    }));
  }

  private applyReportScoresQueryFilters(
    query: ReportSyndromeScoresQueryDto,
    where: Record<string, unknown>,
  ): void {
    if (query.onlyLatest ?? true) {
      where.is_latest = true;
    }
    if (query.reportId) {
      where.report_id = query.reportId;
    }
    if (query.syndromeId) {
      where.syndrome_id = query.syndromeId;
    }
    if (query.processingStatus) {
      where.processing_status = query.processingStatus;
    }
    if (typeof query.isAboveThreshold === 'boolean') {
      where.is_above_threshold = query.isAboveThreshold;
    }
    if (!query.startDate && !query.endDate) {
      return;
    }
    const reportNested = where.report as Record<string, unknown>;
    const createdAt: Record<string, Date> = {};
    where.report = {
      ...reportNested,
      created_at: createdAt,
    };
    if (query.startDate && query.endDate) {
      const { startUtc, endInclusiveUtc } =
        SyndromicClassificationService.reportCalendarDayRangeUtc(
          query.startDate,
          query.endDate,
        );
      createdAt.gte = startUtc;
      createdAt.lte = endInclusiveUtc;
      return;
    }
    if (query.startDate) {
      const { startUtc } = SyndromicClassificationService.reportCalendarDayRangeUtc(
        query.startDate,
        query.startDate,
      );
      createdAt.gte = startUtc;
      return;
    }
    const { endInclusiveUtc } = SyndromicClassificationService.reportCalendarDayRangeUtc(
      query.endDate as string,
      query.endDate as string,
    );
    createdAt.lte = endInclusiveUtc;
  }

  private mapReportScoreListRow(row: any): ReportSyndromeScoreResponseDto {
    return {
      id: row.id,
      reportId: row.report_id,
      occurrenceLocation: row.report?.occurrence_location ?? null,
      syndromeId: row.syndrome_id ?? null,
      syndromeCode: row.syndrome?.code ?? null,
      syndromeName: row.syndrome?.name ?? null,
      score: SyndromicClassificationService.toDecimalNumberOrNull(row.score),
      thresholdScore: SyndromicClassificationService.toDecimalNumberOrNull(
        row.threshold_score_snapshot,
      ),
      isAboveThreshold: row.is_above_threshold ?? null,
      processingStatus: row.processing_status,
      processingError: row.processing_error ?? null,
      processedAt: row.processed_at,
    };
  }

  async listReportScores(
    query: ReportSyndromeScoresQueryDto,
    userId: number,
  ): Promise<ListResponseDto<ReportSyndromeScoreResponseDto>> {
    const page = query.page || 1;
    const pageSize = query.pageSize || 20;
    const skip = (page - 1) * pageSize;

    const contextId = await this.authz.resolveListContextId(
      userId,
      query.contextId,
      'GET /syndromic-classification/reports/scores',
      { allowParticipantContext: true },
    );

    const where: Record<string, unknown> = {
      report: {
        participation: {
          context_id: contextId,
        },
      },
    };
    this.applyReportScoresQueryFilters(query, where);

    const [rows, totalItems] = await Promise.all([
      this.reportSyndromeScoreModel.findMany({
        where: where as any,
        skip,
        take: pageSize,
        include: {
          syndrome: true,
          report: {
            select: {
              occurrence_location: true,
            },
          },
        },
        orderBy: [{ processed_at: 'desc' }, { id: 'desc' }],
      }),
      this.reportSyndromeScoreModel.count({ where: where as any }),
    ]);

    const queryParams: Record<string, unknown> = {};
    if (query.contextId != null) queryParams.contextId = query.contextId;
    if (query.reportId != null) queryParams.reportId = query.reportId;
    if (query.syndromeId != null) queryParams.syndromeId = query.syndromeId;
    if (query.startDate) queryParams.startDate = query.startDate;
    if (query.endDate) queryParams.endDate = query.endDate;
    if (query.processingStatus) queryParams.processingStatus = query.processingStatus;
    if (typeof query.isAboveThreshold === 'boolean') {
      queryParams.isAboveThreshold = query.isAboveThreshold;
    }
    if (query.onlyLatest != null) queryParams.onlyLatest = query.onlyLatest;

    return {
      data: rows.map((row: any) => this.mapReportScoreListRow(row)),
      meta: createPaginationMeta({
        page,
        pageSize,
        totalItems,
        baseUrl: '/v1/syndromic-classification/reports/scores',
        queryParams,
      }),
      links: createPaginationLinks({
        page,
        pageSize,
        totalItems,
        baseUrl: '/v1/syndromic-classification/reports/scores',
        queryParams,
      }),
    };
  }

  private async assertCanReadReportScores(
    userId: number,
    participation: { context_id: number; user_id: number },
  ): Promise<void> {
    if (participation.user_id === userId) return;
    if (await this.authz.isAdmin(userId)) return;
    const managedContextIds = await this.authz.getManagedContextIds(userId);
    if (managedContextIds.includes(participation.context_id)) return;
    throw new ForbiddenException(
      'Sem permissão para acessar scores sindrômicos deste report',
    );
  }

  private applyReprocessDateRangeToWhere(
    dto: ReprocessSyndromicClassificationDto,
    where: Record<string, unknown>,
  ): void {
    if (!dto.startDate && !dto.endDate) {
      return;
    }
    const createdAt: Record<string, Date> = {};
    where.created_at = createdAt;
    if (dto.startDate && dto.endDate) {
      const { startUtc, endInclusiveUtc } =
        SyndromicClassificationService.reportCalendarDayRangeUtc(
          dto.startDate,
          dto.endDate,
        );
      createdAt.gte = startUtc;
      createdAt.lte = endInclusiveUtc;
      return;
    }
    if (dto.startDate) {
      const { startUtc } = SyndromicClassificationService.reportCalendarDayRangeUtc(
        dto.startDate,
        dto.startDate,
      );
      createdAt.gte = startUtc;
      return;
    }
    if (dto.endDate) {
      const { endInclusiveUtc } = SyndromicClassificationService.reportCalendarDayRangeUtc(
        dto.endDate,
        dto.endDate,
      );
      createdAt.lte = endInclusiveUtc;
    }
  }

  private mergeReportIdWithGtCursor(
    existingId: unknown,
    cursor: number,
  ): Record<string, unknown> {
    if (existingId !== null && existingId !== undefined && typeof existingId === 'object') {
      return { ...(existingId as object), gt: cursor };
    }
    return { gt: cursor };
  }

  private static mergeFormVersionSyndromeConfig(
    formVersion: Record<string, unknown> | undefined,
  ): Record<string, unknown> {
    const fv = formVersion ? { ...formVersion } : {};
    const prevForm = fv.form;
    const formMerged =
      prevForm !== null &&
      prevForm !== undefined &&
      typeof prevForm === 'object' &&
      !Array.isArray(prevForm)
        ? { ...(prevForm as object) }
        : {};
    fv.form = {
      ...formMerged,
      syndrome_form_config: { some: { active: true } },
    };
    return fv;
  }

  private buildReprocessReportsWhere(
    dto: ReprocessSyndromicClassificationDto,
  ): Record<string, unknown> {
    const where: Record<string, unknown> = {
      report_type: report_type_enum.POSITIVE,
    };
    if (dto.onlyLatestActive ?? true) {
      where.active = true;
    }
    if (dto.formId) {
      where.form_version = { form_id: dto.formId };
    } else if (dto.formVersionId) {
      where.form_version_id = dto.formVersionId;
    }
    if (dto.reportIds?.length) {
      where.id = { in: dto.reportIds };
    }
    this.applyReprocessDateRangeToWhere(dto, where);
    if (dto.cursor) {
      where.id = this.mergeReportIdWithGtCursor(where.id, dto.cursor);
    }
    where.form_version = SyndromicClassificationService.mergeFormVersionSyndromeConfig(
      where.form_version as Record<string, unknown> | undefined,
    );
    if (dto.contextId != null) {
      where.participation = { context_id: dto.contextId };
    }
    return where;
  }

  async reprocessReports(
    dto: ReprocessSyndromicClassificationDto,
    userId: number,
    auditRequest?: AuditRequestContext,
  ): Promise<{
    jobLikeId: string;
    requestedCount: number;
    processedCount: number;
    skippedCount: number;
    failedCount: number;
    nextCursor: number | null;
  }> {
    const isAdmin = await this.authz.isAdmin(userId);
    if (!isAdmin) {
      throw new ForbiddenException('Somente admin pode reprocessar em lote');
    }

    const where = this.buildReprocessReportsWhere(dto);

    const limit = dto.limit ?? 100;
    const reports = await this.prisma.report.findMany({
      where: where as any,
      orderBy: { id: 'asc' },
      take: limit,
      select: { id: true },
    });

    let processedCount = 0;
    let skippedCount = 0;
    let failedCount = 0;

    for (const report of reports) {
      try {
        await this.classifyReport(report.id);
        const latest = await this.reportSyndromeScoreModel.findFirst({
          where: { report_id: report.id, is_latest: true },
          orderBy: { id: 'desc' },
          select: { processing_status: true },
        });
        if (latest?.processing_status === 'processed') {
          processedCount += 1;
        } else if (latest?.processing_status === 'skipped') {
          skippedCount += 1;
        } else {
          failedCount += 1;
        }
      } catch {
        failedCount += 1;
      }
    }

    const jobLikeId = `reprocess-${randomUUID()}`;
    await this.recordAudit(
      'SYNDROME_REPROCESS_TRIGGER',
      'report_syndrome_score',
      jobLikeId,
      userId,
      {
        reportIds: dto.reportIds ?? null,
        formId: dto.formId ?? null,
        formVersionId: dto.formVersionId ?? null,
        startDate: dto.startDate ?? null,
        endDate: dto.endDate ?? null,
        contextId: dto.contextId ?? null,
        onlyConfiguredForms: true,
        limit,
        cursor: dto.cursor ?? null,
        requestedCount: reports.length,
        processedCount,
        skippedCount,
        failedCount,
      },
      auditRequest,
    );

    return {
      jobLikeId,
      requestedCount: reports.length,
      processedCount,
      skippedCount,
      failedCount,
      nextCursor: reports.length > 0 ? reports.at(-1)?.id ?? null : null,
    };
  }

  async getDailySyndromeCounts(
    query: DailySyndromeCountsQueryDto,
    userId: number,
  ): Promise<{
    labels: string[];
    series: Array<{ syndromeId: number; syndromeName: string; values: number[] }>;
    totalsBySyndrome: Array<{ syndromeId: number; syndromeName: string; total: number }>;
  }> {
    const contextId = await this.authz.resolveListContextId(
      userId,
      query.contextId,
      'GET /syndromic-classification/reports/daily-syndrome-counts',
      { allowParticipantContext: true },
    );

    const startDate = new Date(query.startDate);
    const endDate = new Date(query.endDate);
    if (startDate > endDate) {
      throw new BadRequestException('startDate deve ser menor ou igual a endDate');
    }

    const syndromeFilter =
      query.syndromeIds && query.syndromeIds.length > 0
        ? Prisma.sql`AND rss.syndrome_id = ANY (${query.syndromeIds})`
        : Prisma.empty;

    const { startUtc, endInclusiveUtc } =
      SyndromicClassificationService.reportCalendarDayRangeUtc(
        query.startDate,
        query.endDate,
      );

    const rows = await this.prisma.$queryRaw<
      Array<{
        report_day: Date;
        syndrome_id: number;
        syndrome_name: string;
        total: number;
      }>
    >(Prisma.sql`
      SELECT
        (timezone(${SyndromicClassificationService.REPORT_DAY_TZ}, r.created_at))::date AS report_day,
        rss.syndrome_id,
        s.name AS syndrome_name,
        COUNT(*)::int AS total
      FROM report_syndrome_score rss
      INNER JOIN report r ON r.id = rss.report_id
      INNER JOIN participation p ON p.id = r.participation_id
      INNER JOIN syndrome s ON s.id = rss.syndrome_id
      WHERE rss.is_latest = true
        AND rss.processing_status = 'processed'
        AND r.report_type = ${report_type_enum.POSITIVE}::report_type_enum
        AND p.context_id = ${contextId}
        AND r.created_at >= ${startUtc}
        AND r.created_at <= ${endInclusiveUtc}
        AND rss.syndrome_id IS NOT NULL
        ${query.onlyAboveThreshold === false ? Prisma.empty : Prisma.sql`AND rss.is_above_threshold = true`}
        ${syndromeFilter}
      GROUP BY 1, 2, 3
      ORDER BY 1 ASC, 3 ASC
    `);

    const labels = this.buildDateLabels(query.startDate, query.endDate);
    const indexByLabel = new Map<string, number>();
    labels.forEach((label, idx) => indexByLabel.set(label, idx));

    const seriesMap = new Map<number, { syndromeName: string; values: number[] }>();
    for (const row of rows) {
      if (!seriesMap.has(row.syndrome_id)) {
        seriesMap.set(row.syndrome_id, {
          syndromeName: row.syndrome_name,
          values: labels.map(() => 0),
        });
      }
      const day = new Date(row.report_day).toISOString().split('T')[0];
      const idx = indexByLabel.get(day);
      if (idx !== undefined) {
        const entry = seriesMap.get(row.syndrome_id);
        if (entry !== undefined) {
          entry.values[idx] = Number(row.total);
        }
      }
    }

    const series = Array.from(seriesMap.entries()).map(([syndromeId, data]) => ({
      syndromeId,
      syndromeName: data.syndromeName,
      values: data.values,
    }));

    const totalsBySyndrome = series
      .map((item) => ({
        syndromeId: item.syndromeId,
        syndromeName: item.syndromeName,
        total: item.values.reduce((acc, value) => acc + value, 0),
      }))
      .sort((a, b) => b.total - a.total);

    return {
      labels,
      series,
      totalsBySyndrome,
    };
  }

  private buildDateLabels(startDate: string, endDate: string): string[] {
    const labels: string[] = [];
    const current = new Date(`${startDate}T00:00:00.000Z`);
    const end = new Date(`${endDate}T00:00:00.000Z`);
    while (current <= end) {
      labels.push(current.toISOString().split('T')[0]);
      current.setUTCDate(current.getUTCDate() + 1);
    }
    return labels;
  }

  async listSymptoms(): Promise<any[]> {
    return this.symptomModel.findMany({ orderBy: { name: 'asc' } });
  }

  async createSymptom(
    dto: CreateSymptomDto,
    actorUserId: number,
    auditRequest?: AuditRequestContext,
  ): Promise<any> {
    const created = await this.symptomModel.create({
      data: {
        code: dto.code.trim(),
        name: dto.name.trim(),
        description: dto.description ?? null,
      },
    });
    await this.recordAudit(
      'SYNDROME_CONFIG_CREATE',
      'symptom',
      created.id,
      actorUserId,
      { code: created.code, name: created.name },
      auditRequest,
    );
    return created;
  }

  async updateSymptom(
    id: number,
    dto: UpdateSymptomDto,
    actorUserId: number,
    auditRequest?: AuditRequestContext,
  ): Promise<any> {
    const existing = await this.symptomModel.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundException(`Symptom ${id} não encontrado`);
    }
    const data: Record<string, unknown> = {};
    if (dto.code !== undefined) {
      data.code = dto.code.trim();
    }
    if (dto.name !== undefined) {
      data.name = dto.name.trim();
    }
    if (dto.description !== undefined) {
      data.description = dto.description;
    }
    if (dto.active !== undefined) {
      data.active = dto.active;
    }
    const updated = await this.symptomModel.update({
      where: { id },
      data: data as any,
    });
    await this.recordAudit(
      'SYNDROME_CONFIG_UPDATE',
      'symptom',
      updated.id,
      actorUserId,
      { before: existing, after: updated },
      auditRequest,
    );
    return updated;
  }

  async removeSymptom(
    id: number,
    actorUserId: number,
    auditRequest?: AuditRequestContext,
  ): Promise<void> {
    const existing = await this.symptomModel.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundException(`Symptom ${id} não encontrado`);
    }
    await this.symptomModel.update({
      where: { id },
      data: { active: false },
    });
    await this.recordAudit(
      'SYNDROME_CONFIG_DELETE',
      'symptom',
      id,
      actorUserId,
      { code: existing.code, name: existing.name },
      auditRequest,
    );
  }

  async listSyndromes(): Promise<any[]> {
    return this.syndromeModel.findMany({ orderBy: { name: 'asc' } });
  }

  async createSyndrome(
    dto: CreateSyndromeDto,
    actorUserId: number,
    auditRequest?: AuditRequestContext,
  ): Promise<any> {
    const created = await this.syndromeModel.create({
      data: {
        code: dto.code.trim(),
        name: dto.name.trim(),
        description: dto.description ?? null,
        threshold_score: dto.thresholdScore ?? 0,
      },
    });
    await this.recordAudit(
      'SYNDROME_CONFIG_CREATE',
      'syndrome',
      created.id,
      actorUserId,
      { code: created.code, name: created.name },
      auditRequest,
    );
    return created;
  }

  async updateSyndrome(
    id: number,
    dto: UpdateSyndromeDto,
    actorUserId: number,
    auditRequest?: AuditRequestContext,
  ): Promise<any> {
    const existing = await this.syndromeModel.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundException(`Syndrome ${id} não encontrada`);
    }
    const syndromeData: Record<string, unknown> = {};
    if (dto.code !== undefined) {
      syndromeData.code = dto.code.trim();
    }
    if (dto.name !== undefined) {
      syndromeData.name = dto.name.trim();
    }
    if (dto.description !== undefined) {
      syndromeData.description = dto.description;
    }
    if (dto.thresholdScore !== undefined) {
      syndromeData.threshold_score = dto.thresholdScore;
    }
    if (dto.active !== undefined) {
      syndromeData.active = dto.active;
    }
    const updated = await this.syndromeModel.update({
      where: { id },
      data: syndromeData as any,
    });
    await this.recordAudit(
      'SYNDROME_CONFIG_UPDATE',
      'syndrome',
      updated.id,
      actorUserId,
      { before: existing, after: updated },
      auditRequest,
    );
    return updated;
  }

  async removeSyndrome(
    id: number,
    actorUserId: number,
    auditRequest?: AuditRequestContext,
  ): Promise<void> {
    const existing = await this.syndromeModel.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundException(`Syndrome ${id} não encontrada`);
    }
    await this.syndromeModel.update({
      where: { id },
      data: { active: false },
    });
    await this.recordAudit(
      'SYNDROME_CONFIG_DELETE',
      'syndrome',
      id,
      actorUserId,
      { code: existing.code, name: existing.name },
      auditRequest,
    );
  }

  async listWeights(): Promise<any[]> {
    return this.syndromeSymptomWeightModel.findMany({
      include: { syndrome: true, symptom: true },
      orderBy: [{ syndrome_id: 'asc' }, { symptom_id: 'asc' }],
    });
  }

  async createWeight(
    dto: CreateSyndromeWeightDto,
    actorUserId: number,
    auditRequest?: AuditRequestContext,
  ): Promise<any> {
    const row = await this.syndromeSymptomWeightModel.create({
      data: {
        syndrome_id: dto.syndromeId,
        symptom_id: dto.symptomId,
        weight: dto.weight,
      },
    });
    await this.recordAudit(
      'SYNDROME_CONFIG_CREATE',
      'syndrome_symptom_weight',
      row.id,
      actorUserId,
      {
        syndromeId: row.syndrome_id,
        symptomId: row.symptom_id,
        weight: Number(row.weight),
      },
      auditRequest,
    );
    return row;
  }

  async updateWeight(
    id: number,
    dto: UpdateSyndromeWeightDto,
    actorUserId: number,
    auditRequest?: AuditRequestContext,
  ): Promise<any> {
    const existing = await this.syndromeSymptomWeightModel.findUnique({
      where: { id },
    });
    if (!existing) {
      throw new NotFoundException(`Peso ${id} não encontrado`);
    }
    const weightData: Record<string, unknown> = {};
    if (dto.weight !== undefined) {
      weightData.weight = dto.weight;
    }
    if (dto.active !== undefined) {
      weightData.active = dto.active;
    }
    const updated = await this.syndromeSymptomWeightModel.update({
      where: { id },
      data: weightData as any,
    });
    await this.recordAudit(
      'SYNDROME_CONFIG_UPDATE',
      'syndrome_symptom_weight',
      updated.id,
      actorUserId,
      { before: existing, after: updated },
      auditRequest,
    );
    return updated;
  }

  async removeWeight(
    id: number,
    actorUserId: number,
    auditRequest?: AuditRequestContext,
  ): Promise<void> {
    const existing = await this.syndromeSymptomWeightModel.findUnique({
      where: { id },
    });
    if (!existing) {
      throw new NotFoundException(`Peso ${id} não encontrado`);
    }
    await this.syndromeSymptomWeightModel.update({
      where: { id },
      data: { active: false },
    });
    await this.recordAudit(
      'SYNDROME_CONFIG_DELETE',
      'syndrome_symptom_weight',
      id,
      actorUserId,
      {
        syndromeId: existing.syndrome_id,
        symptomId: existing.symptom_id,
      },
      auditRequest,
    );
  }

  async getWeightMatrix(): Promise<{
    syndromes: any[];
    symptoms: any[];
    cells: any[];
    generatedAt: Date;
  }> {
    const [syndromes, symptoms, cells] = await Promise.all([
      this.syndromeModel.findMany({
        where: { active: true },
        select: { id: true, code: true, name: true, threshold_score: true },
        orderBy: { name: 'asc' },
      }),
      this.symptomModel.findMany({
        where: { active: true },
        select: { id: true, code: true, name: true },
        orderBy: { name: 'asc' },
      }),
      this.syndromeSymptomWeightModel.findMany({
        where: { active: true },
        select: {
          id: true,
          syndrome_id: true,
          symptom_id: true,
          weight: true,
          updated_at: true,
        },
      }),
    ]);

    return {
      syndromes: syndromes.map((item: any) => ({
        ...item,
        threshold_score: Number(item.threshold_score),
      })),
      symptoms,
      cells: cells.map((item: any) => ({
        id: item.id,
        syndromeId: item.syndrome_id,
        symptomId: item.symptom_id,
        weight: Number(item.weight),
        updatedAt: item.updated_at,
      })),
      generatedAt: new Date(),
    };
  }

  async upsertWeightMatrix(
    dto: UpsertSyndromeWeightMatrixDto,
    actorUserId: number,
    auditRequest?: AuditRequestContext,
  ): Promise<{ updatedCount: number }> {
    const uniqueKeySet = new Set<string>();
    for (const cell of dto.cells) {
      const key = `${cell.syndromeId}-${cell.symptomId}`;
      if (uniqueKeySet.has(key)) {
        throw new BadRequestException(
          `Duplicidade na matriz para syndromeId=${cell.syndromeId}, symptomId=${cell.symptomId}`,
        );
      }
      uniqueKeySet.add(key);
    }

    await this.prisma.$transaction(async (tx) => {
      for (const cell of dto.cells) {
        await (tx as any).syndrome_symptom_weight.upsert({
          where: {
            syndrome_id_symptom_id: {
              syndrome_id: cell.syndromeId,
              symptom_id: cell.symptomId,
            },
          },
          create: {
            syndrome_id: cell.syndromeId,
            symptom_id: cell.symptomId,
            weight: cell.weight,
            active: cell.active ?? true,
          },
          update: {
            weight: cell.weight,
            active: cell.active ?? true,
          },
        });
      }
    });

    await this.recordAudit(
      'SYNDROME_MATRIX_UPDATE',
      'syndrome_symptom_weight',
      `matrix:${dto.cells.length}`,
      actorUserId,
      {
        updatedCount: dto.cells.length,
        sample: dto.cells.slice(0, 10),
      },
      auditRequest,
    );

    return {
      updatedCount: dto.cells.length,
    };
  }

  async listFormConfigs(): Promise<any[]> {
    return this.syndromeFormConfigModel.findMany({
      include: {
        form: {
          select: {
            id: true,
            title: true,
            reference: true,
            active: true,
          },
        },
      },
      orderBy: { id: 'desc' },
    });
  }

  async createFormConfig(
    dto: CreateSyndromeFormConfigDto,
    actorUserId: number,
    auditRequest?: AuditRequestContext,
  ): Promise<any> {
    this.validateSymptomsFieldSelector(dto.symptomsFieldName, dto.symptomsFieldId);
    const created = await this.syndromeFormConfigModel.create({
      data: {
        form_id: dto.formId,
        symptoms_field_name: dto.symptomsFieldName ?? null,
        symptoms_field_id: dto.symptomsFieldId ?? null,
        symptom_onset_date_field_name: dto.symptomOnsetDateFieldName ?? null,
        symptom_onset_date_field_id: dto.symptomOnsetDateFieldId ?? null,
        active: dto.active ?? true,
      },
    });
    await this.recordAudit(
      'SYNDROME_CONFIG_CREATE',
      'syndrome_form_config',
      created.id,
      actorUserId,
      created,
      auditRequest,
    );
    return created;
  }

  async updateFormConfig(
    id: number,
    dto: UpdateSyndromeFormConfigDto,
    actorUserId: number,
    auditRequest?: AuditRequestContext,
  ): Promise<any> {
    const existing = await this.syndromeFormConfigModel.findUnique({
      where: { id },
    });
    if (!existing) {
      throw new NotFoundException(`Configuração ${id} não encontrada`);
    }
    this.validateSymptomsFieldSelector(
      dto.symptomsFieldName ?? existing.symptoms_field_name,
      dto.symptomsFieldId ?? existing.symptoms_field_id,
    );
    const formConfigData: Record<string, unknown> = {};
    if (dto.formId !== undefined) {
      formConfigData.form_id = dto.formId;
    }
    if (dto.symptomsFieldName !== undefined) {
      formConfigData.symptoms_field_name = dto.symptomsFieldName;
    }
    if (dto.symptomsFieldId !== undefined) {
      formConfigData.symptoms_field_id = dto.symptomsFieldId;
    }
    if (dto.symptomOnsetDateFieldName !== undefined) {
      formConfigData.symptom_onset_date_field_name = dto.symptomOnsetDateFieldName;
    }
    if (dto.symptomOnsetDateFieldId !== undefined) {
      formConfigData.symptom_onset_date_field_id = dto.symptomOnsetDateFieldId;
    }
    if (dto.active !== undefined) {
      formConfigData.active = dto.active;
    }
    const updated = await this.syndromeFormConfigModel.update({
      where: { id },
      data: formConfigData as any,
    });
    await this.recordAudit(
      'SYNDROME_CONFIG_UPDATE',
      'syndrome_form_config',
      id,
      actorUserId,
      { before: existing, after: updated },
      auditRequest,
    );
    return updated;
  }

  async removeFormConfig(
    id: number,
    actorUserId: number,
    auditRequest?: AuditRequestContext,
  ): Promise<void> {
    const existing = await this.syndromeFormConfigModel.findUnique({
      where: { id },
    });
    if (!existing) {
      throw new NotFoundException(`Configuração ${id} não encontrada`);
    }
    await this.syndromeFormConfigModel.update({
      where: { id },
      data: { active: false },
    });
    await this.recordAudit(
      'SYNDROME_CONFIG_DELETE',
      'syndrome_form_config',
      id,
      actorUserId,
      existing,
      auditRequest,
    );
  }

  private validateSymptomsFieldSelector(
    fieldName?: string | null,
    fieldId?: string | null,
  ): void {
    if (!fieldName && !fieldId) {
      throw new BadRequestException(
        'Informe symptomsFieldName ou symptomsFieldId',
      );
    }
  }

  async listFormSymptomMappings(): Promise<any[]> {
    return this.formSymptomMappingModel.findMany({
      include: {
        symptom: {
          select: { id: true, code: true, name: true },
        },
      },
      orderBy: [{ syndrome_form_config_id: 'asc' }, { form_option_value: 'asc' }],
    });
  }

  async createFormSymptomMapping(
    dto: CreateFormSymptomMappingDto,
    actorUserId: number,
    auditRequest?: AuditRequestContext,
  ): Promise<any> {
    const created = await this.formSymptomMappingModel.create({
      data: {
        syndrome_form_config_id: dto.syndromeFormConfigId,
        form_option_value: dto.formOptionValue,
        form_option_label: dto.formOptionLabel ?? null,
        symptom_id: dto.symptomId,
        active: dto.active ?? true,
      },
    });
    await this.recordAudit(
      'SYNDROME_CONFIG_CREATE',
      'form_symptom_mapping',
      created.id,
      actorUserId,
      created,
      auditRequest,
    );
    return created;
  }

  async updateFormSymptomMapping(
    id: number,
    dto: UpdateFormSymptomMappingDto,
    actorUserId: number,
    auditRequest?: AuditRequestContext,
  ): Promise<any> {
    const existing = await this.formSymptomMappingModel.findUnique({
      where: { id },
    });
    if (!existing) {
      throw new NotFoundException(`Mapping ${id} não encontrado`);
    }
    const mappingData: Record<string, unknown> = {};
    if (dto.syndromeFormConfigId !== undefined) {
      mappingData.syndrome_form_config_id = dto.syndromeFormConfigId;
    }
    if (dto.formOptionValue !== undefined) {
      mappingData.form_option_value = dto.formOptionValue;
    }
    if (dto.formOptionLabel !== undefined) {
      mappingData.form_option_label = dto.formOptionLabel;
    }
    if (dto.symptomId !== undefined) {
      mappingData.symptom_id = dto.symptomId;
    }
    if (dto.active !== undefined) {
      mappingData.active = dto.active;
    }
    const updated = await this.formSymptomMappingModel.update({
      where: { id },
      data: mappingData as any,
    });
    await this.recordAudit(
      'SYNDROME_CONFIG_UPDATE',
      'form_symptom_mapping',
      id,
      actorUserId,
      { before: existing, after: updated },
      auditRequest,
    );
    return updated;
  }

  async removeFormSymptomMapping(
    id: number,
    actorUserId: number,
    auditRequest?: AuditRequestContext,
  ): Promise<void> {
    const existing = await this.formSymptomMappingModel.findUnique({
      where: { id },
    });
    if (!existing) {
      throw new NotFoundException(`Mapping ${id} não encontrado`);
    }
    await this.formSymptomMappingModel.update({
      where: { id },
      data: { active: false },
    });
    await this.recordAudit(
      'SYNDROME_CONFIG_DELETE',
      'form_symptom_mapping',
      id,
      actorUserId,
      existing,
      auditRequest,
    );
  }

  private async recordAudit(
    action: any,
    targetEntityType: any,
    targetEntityId: number | string,
    actorUserId: number,
    metadata: AuditMeta,
    request?: AuditRequestContext,
  ): Promise<void> {
    await this.auditLogService.record({
      action,
      targetEntityType,
      targetEntityId,
      actor: { userId: actorUserId },
      metadata,
      request: request ?? null,
    });
  }
}
