import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { Prisma, report_type_enum } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { AuthzService } from '../authz/authz.service';
import { CreateReportDto } from './dto/create-report.dto';
import { UpdateReportDto } from './dto/update-report.dto';
import { ReportQueryDto } from './dto/report-query.dto';
import { ReportResponseDto } from './dto/report-response.dto';
import {
  ReportsPointsQueryDto,
  REPORTS_POINTS_DEFAULT_LIMIT,
  REPORTS_POINTS_MAX_LIMIT,
} from './dto/reports-points-query.dto';
import { ReportPointResponseDto } from './dto/report-point-response.dto';
import { ReportStreakQueryDto } from './dto/report-streak-query.dto';
import { ReportStreakSummaryResponseDto } from './dto/report-streak-summary-response.dto';
import { ParticipationReportStreakQueryDto } from './dto/participation-report-streak-query.dto';
import { ParticipationReportStreakResponseDto } from './dto/participation-report-streak-response.dto';
import { ListResponseDto } from '../common/dto/list-response.dto';
import {
  createPaginationMeta,
  createPaginationLinks,
} from '../common/helpers/pagination.helper';

type ReportMetricsClient = Prisma.TransactionClient | PrismaService;

@Injectable()
export class ReportsService {
  private readonly logger = new Logger(ReportsService.name);

  constructor(
    private prisma: PrismaService,
    private authz: AuthzService,
  ) {}

  /**
   * Verifica se o usuário pode operar sobre um report.
   * Admin: sempre pode. Manager/content_manager: deve gerenciar o contexto da participação.
   */
  private async assertCanManageReport(
    userId: number,
    reportContextId: number,
  ): Promise<void> {
    const isAdmin = await this.authz.isAdmin(userId);
    if (isAdmin) return;
    const canManage = await this.authz.hasAnyRole(userId, reportContextId, [
      'manager',
      'content_manager',
    ]);
    if (!canManage) {
      throw new ForbiddenException(
        'Você não tem permissão para acessar este report',
      );
    }
  }

  private normalizeDateOnly(value: Date): Date {
    const normalized = new Date(value);
    normalized.setUTCHours(0, 0, 0, 0);
    return normalized;
  }

  private parseDateOnly(value: string): Date {
    return new Date(`${value}T00:00:00.000Z`);
  }

  private formatDateOnly(value?: Date | null): string | null {
    return value ? value.toISOString().split('T')[0] : null;
  }

  private getTimestampDayRange(value: Date): { start: Date; end: Date } {
    const start = new Date(value);
    start.setHours(0, 0, 0, 0);

    const end = new Date(value);
    end.setHours(23, 59, 59, 999);

    return { start, end };
  }

  private calculateStreakMetrics(reportDays: Array<{ report_date: Date }>): {
    currentStreak: number;
    longestStreak: number;
    reportedDaysCount: number;
    lastReportedDate: Date | null;
    currentStreakStartDate: Date | null;
  } {
    if (reportDays.length === 0) {
      return {
        currentStreak: 0,
        longestStreak: 0,
        reportedDaysCount: 0,
        lastReportedDate: null,
        currentStreakStartDate: null,
      };
    }

    const dates = reportDays.map((item) =>
      this.normalizeDateOnly(item.report_date),
    );
    const dayInMs = 24 * 60 * 60 * 1000;

    let longestStreak = 1;
    let runningStreak = 1;

    for (let index = 1; index < dates.length; index += 1) {
      const diffInDays = Math.round(
        (dates[index].getTime() - dates[index - 1].getTime()) / dayInMs,
      );

      if (diffInDays === 1) {
        runningStreak += 1;
      } else {
        runningStreak = 1;
      }

      if (runningStreak > longestStreak) {
        longestStreak = runningStreak;
      }
    }

    let currentStreak = 1;

    for (let index = dates.length - 1; index > 0; index -= 1) {
      const diffInDays = Math.round(
        (dates[index].getTime() - dates[index - 1].getTime()) / dayInMs,
      );

      if (diffInDays !== 1) {
        break;
      }

      currentStreak += 1;
    }

    return {
      currentStreak,
      longestStreak,
      reportedDaysCount: dates.length,
      lastReportedDate: dates[dates.length - 1],
      currentStreakStartDate: dates[dates.length - currentStreak],
    };
  }

  private async refreshParticipationReportDay(
    prisma: ReportMetricsClient,
    participationId: number,
    reportDate: Date,
  ): Promise<void> {
    const normalizedDate = this.normalizeDateOnly(reportDate);
    const { start, end } = this.getTimestampDayRange(reportDate);

    const reports = await prisma.report.findMany({
      where: {
        participation_id: participationId,
        active: true,
        created_at: {
          gte: start,
          lte: end,
        },
      },
      select: {
        report_type: true,
      },
    });

    if (reports.length === 0) {
      await prisma.participation_report_day.deleteMany({
        where: {
          participation_id: participationId,
          report_date: normalizedDate,
        },
      });
      return;
    }

    const positiveCount = reports.filter(
      (report) => report.report_type === report_type_enum.POSITIVE,
    ).length;

    await prisma.participation_report_day.upsert({
      where: {
        participation_id_report_date: {
          participation_id: participationId,
          report_date: normalizedDate,
        },
      },
      create: {
        participation_id: participationId,
        report_date: normalizedDate,
        report_count: reports.length,
        positive_count: positiveCount,
        negative_count: reports.length - positiveCount,
      },
      update: {
        report_count: reports.length,
        positive_count: positiveCount,
        negative_count: reports.length - positiveCount,
      },
    });
  }

  private async refreshParticipationReportStreak(
    prisma: ReportMetricsClient,
    participationId: number,
  ): Promise<void> {
    const reportDays = await prisma.participation_report_day.findMany({
      where: {
        participation_id: participationId,
      },
      select: {
        report_date: true,
      },
      orderBy: {
        report_date: 'asc',
      },
    });

    const metrics = this.calculateStreakMetrics(reportDays);

    await prisma.participation_report_streak.upsert({
      where: {
        participation_id: participationId,
      },
      create: {
        participation_id: participationId,
        current_streak: metrics.currentStreak,
        longest_streak: metrics.longestStreak,
        reported_days_count: metrics.reportedDaysCount,
        last_reported_date: metrics.lastReportedDate,
        current_streak_start_date: metrics.currentStreakStartDate,
      },
      update: {
        current_streak: metrics.currentStreak,
        longest_streak: metrics.longestStreak,
        reported_days_count: metrics.reportedDaysCount,
        last_reported_date: metrics.lastReportedDate,
        current_streak_start_date: metrics.currentStreakStartDate,
      },
    });
  }

  private async refreshParticipationReportMetrics(
    prisma: ReportMetricsClient,
    participationId: number,
    reportDate: Date,
  ): Promise<void> {
    await this.refreshParticipationReportDay(
      prisma,
      participationId,
      reportDate,
    );
    await this.refreshParticipationReportStreak(prisma, participationId);
  }

  private mapToReportStreakSummaryDto(
    participation: any,
  ): ReportStreakSummaryResponseDto {
    const streak = participation.participation_report_streak;

    return {
      participationId: participation.id,
      userId: participation.user_id,
      userName: participation.user?.name ?? '',
      userEmail: participation.user?.email ?? '',
      active: participation.active,
      currentStreak: streak?.current_streak ?? 0,
      longestStreak: streak?.longest_streak ?? 0,
      reportedDaysCount: streak?.reported_days_count ?? 0,
      lastReportedDate: this.formatDateOnly(streak?.last_reported_date),
      currentStreakStartDate: this.formatDateOnly(
        streak?.current_streak_start_date,
      ),
    };
  }

  async create(
    createReportDto: CreateReportDto,
    userId: number,
  ): Promise<ReportResponseDto> {
    // Validar participação
    const participation = await this.prisma.participation.findUnique({
      where: { id: createReportDto.participationId },
    });

    if (!participation) {
      throw new BadRequestException(
        `Participação com ID ${createReportDto.participationId} não encontrada`,
      );
    }

    // Validar que o usuário autenticado é dono da participação
    // ou é manager/admin do contexto (envio em nome de outro participante)
    const isAdmin = await this.authz.isAdmin(userId);
    if (!isAdmin && participation.user_id !== userId) {
      const canManage = await this.authz.hasAnyRole(
        userId,
        participation.context_id,
        ['manager', 'content_manager'],
      );
      if (!canManage) {
        throw new ForbiddenException(
          'Você não pode criar um report para a participação de outro usuário',
        );
      }
    }

    // Validar versão do formulário
    const formVersion = await this.prisma.form_version.findUnique({
      where: { id: createReportDto.formVersionId },
    });

    if (!formVersion) {
      throw new BadRequestException(
        `Versão do formulário com ID ${createReportDto.formVersionId} não encontrada`,
      );
    }

    // Preparar dados
    const data: any = {
      participation_id: createReportDto.participationId,
      form_version_id: createReportDto.formVersionId,
      report_type: createReportDto.reportType,
      form_response: createReportDto.formResponse,
      active: createReportDto.active ?? true,
    };

    if (createReportDto.occurrenceLocation !== undefined) {
      data.occurrence_location = createReportDto.occurrenceLocation;
    }

    const report = await this.prisma.report.create({ data });

    try {
      await this.refreshParticipationReportMetrics(
        this.prisma,
        report.participation_id,
        report.created_at,
      );
    } catch (error) {
      const err = error as Error;
      this.logger.error(
        {
          reportId: report.id,
          participationId: report.participation_id,
          errMessage: err?.message,
        },
        'Falha ao atualizar métricas de report; dados agregados podem estar desatualizados',
      );
    }

    return this.mapToResponseDto(report);
  }

  async findAll(
    query: ReportQueryDto,
    userId: number,
  ): Promise<ListResponseDto<ReportResponseDto>> {
    const page = query.page || 1;
    const pageSize = query.pageSize || 20;
    const skip = (page - 1) * pageSize;

    const filterContextId = await this.authz.resolveListContextId(
      userId,
      query.contextId,
      'GET /reports',
    );

    // Construir filtros (context_id sempre aplicado via participação)
    const where: any = {
      participation: { context_id: filterContextId },
    };

    if (query.active !== undefined) {
      where.active = query.active;
    } else {
      // Por padrão, mostrar apenas reports ativos
      where.active = true;
    }

    if (query.participationId !== undefined) {
      where.participation_id = query.participationId;
    }

    if (query.formVersionId !== undefined) {
      where.form_version_id = query.formVersionId;
    }

    if (query.reportType !== undefined) {
      where.report_type = query.reportType;
    }

    // Filtro por formulário (através do formVersion)
    if (query.formId !== undefined) {
      where.form_version = {
        form_id: query.formId,
      };
    }

    // Filtro por período (data de criação)
    if (query.startDate || query.endDate) {
      where.created_at = {};
      if (query.startDate) {
        const startDate = new Date(query.startDate);
        startDate.setHours(0, 0, 0, 0);
        where.created_at.gte = startDate;
      }
      if (query.endDate) {
        const endDate = new Date(query.endDate);
        endDate.setHours(23, 59, 59, 999);
        where.created_at.lte = endDate;
      }
    }

    // Buscar reports e total
    const [reports, totalItems] = await Promise.all([
      this.prisma.report.findMany({
        where,
        skip,
        take: pageSize,
        orderBy: { created_at: 'desc' },
      }),
      this.prisma.report.count({ where }),
    ]);

    // Criar resposta paginada
    const baseUrl = '/v1/reports';
    const queryParams: Record<string, any> = {};
    if (query.active !== undefined) queryParams.active = query.active;
    if (query.participationId !== undefined)
      queryParams.participationId = query.participationId;
    if (query.formVersionId !== undefined)
      queryParams.formVersionId = query.formVersionId;
    if (query.reportType !== undefined)
      queryParams.reportType = query.reportType;
    if (query.formId !== undefined) queryParams.formId = query.formId;
    if (query.startDate !== undefined) queryParams.startDate = query.startDate;
    if (query.endDate !== undefined) queryParams.endDate = query.endDate;
    if (query.contextId !== undefined) queryParams.contextId = query.contextId;

    return {
      data: reports.map((report) => this.mapToResponseDto(report)),
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

  async findOne(id: number, userId: number): Promise<ReportResponseDto> {
    const report = await this.prisma.report.findUnique({
      where: { id },
      include: { participation: { select: { context_id: true } } },
    });

    if (!report) {
      throw new NotFoundException(`Report com ID ${id} não encontrado`);
    }

    await this.assertCanManageReport(
      userId,
      (report as any).participation.context_id,
    );

    return this.mapToResponseDto(report);
  }

  async update(
    id: number,
    updateReportDto: UpdateReportDto,
    userId: number,
  ): Promise<ReportResponseDto> {
    // Verificar se report existe
    const existingReport = await this.prisma.report.findUnique({
      where: { id },
      include: { participation: { select: { context_id: true } } },
    });

    if (!existingReport) {
      throw new NotFoundException(`Report com ID ${id} não encontrado`);
    }

    await this.assertCanManageReport(
      userId,
      (existingReport as any).participation.context_id,
    );

    // Validar participação se fornecido
    if (updateReportDto.participationId !== undefined) {
      const participation = await this.prisma.participation.findUnique({
        where: { id: updateReportDto.participationId },
      });

      if (!participation) {
        throw new BadRequestException(
          `Participação com ID ${updateReportDto.participationId} não encontrada`,
        );
      }
    }

    // Validar versão do formulário se fornecido
    if (updateReportDto.formVersionId !== undefined) {
      const formVersion = await this.prisma.form_version.findUnique({
        where: { id: updateReportDto.formVersionId },
      });

      if (!formVersion) {
        throw new BadRequestException(
          `Versão do formulário com ID ${updateReportDto.formVersionId} não encontrada`,
        );
      }
    }

    // Preparar dados de atualização
    const updateData: any = {};

    if (updateReportDto.participationId !== undefined) {
      updateData.participation_id = updateReportDto.participationId;
    }

    if (updateReportDto.formVersionId !== undefined) {
      updateData.form_version_id = updateReportDto.formVersionId;
    }

    if (updateReportDto.reportType !== undefined) {
      updateData.report_type = updateReportDto.reportType;
    }

    if (updateReportDto.formResponse !== undefined) {
      updateData.form_response = updateReportDto.formResponse;
    }

    if (updateReportDto.occurrenceLocation !== undefined) {
      updateData.occurrence_location = updateReportDto.occurrenceLocation;
    }

    if (updateReportDto.active !== undefined) {
      updateData.active = updateReportDto.active;
    }

    // Atualizar report
    const report = await this.prisma.report.update({
      where: { id },
      data: updateData,
    });

    return this.mapToResponseDto(report);
  }

  async remove(id: number, userId: number): Promise<void> {
    // Verificar se report existe
    const report = await this.prisma.report.findUnique({
      where: { id },
      include: { participation: { select: { context_id: true } } },
    });

    if (!report) {
      throw new NotFoundException(`Report com ID ${id} não encontrado`);
    }

    await this.assertCanManageReport(
      userId,
      (report as any).participation.context_id,
    );

    // Hard delete - remoção permanente
    await this.prisma.report.delete({
      where: { id },
    });
  }

  async findPoints(
    query: ReportsPointsQueryDto,
    userId: number,
  ): Promise<ReportPointResponseDto[]> {
    const filterContextId = await this.authz.resolveListContextId(
      userId,
      query.contextId,
      'GET /reports/points',
      { allowParticipantContext: true },
    );

    // Converter datas para Date objects
    const startDate = new Date(query.startDate);
    startDate.setHours(0, 0, 0, 0);
    startDate.setMinutes(0);
    startDate.setSeconds(0);
    startDate.setMilliseconds(0);

    const endDate = new Date(query.endDate);
    endDate.setHours(23, 59, 59, 999);
    endDate.setMinutes(59);
    endDate.setSeconds(59);
    endDate.setMilliseconds(999);

    // Buscar reports ativos dentro do período, sempre filtrados pelo contexto
    const whereClause: any = {
      active: true,
      created_at: {
        gte: startDate,
        lte: endDate,
      },
      participation: {
        active: true,
        context_id: filterContextId,
      },
      // Prisma.Json: `not: null` gera `::jsonb <> $n` (lento, não usa índice parcial IS NOT NULL).
      occurrence_location: { not: Prisma.DbNull },
    };

    // Construir filtro de formulário
    const formVersionFilter: any = {
      active: true,
    };

    // Se formId foi fornecido, filtrar por ID do formulário
    if (query.formId) {
      formVersionFilter.form_id = query.formId;
    }

    // Se formReference foi fornecido, filtrar por referência do formulário
    if (query.formReference) {
      // Se já existe um filtro de form (não deveria acontecer, mas por segurança)
      if (!formVersionFilter.form) {
        formVersionFilter.form = {};
      }
      formVersionFilter.form.reference = query.formReference;
      formVersionFilter.form.active = true;
    }

    // Aplicar filtro de formulário apenas se algum parâmetro foi fornecido
    if (query.formId || query.formReference) {
      whereClause.form_version = formVersionFilter;
    }

    const take = Math.min(
      query.limit ?? REPORTS_POINTS_DEFAULT_LIMIT,
      REPORTS_POINTS_MAX_LIMIT,
    );

    const hasFormFilter = !!(query.formId || query.formReference);

    const reports = hasFormFilter
      ? await this.prisma.report.findMany({
          where: whereClause,
          select: {
            report_type: true,
            occurrence_location: true,
          },
          take,
          orderBy: { created_at: 'desc' },
        })
      : await this.fetchReportPointsRaw(
          filterContextId,
          startDate,
          endDate,
          take,
        );

    // Filtrar e mapear apenas reports com latitude e longitude válidas
    const points: ReportPointResponseDto[] = [];

    for (const report of reports) {
      const location = report.occurrence_location as any;

      // Verificar se location tem latitude e longitude
      if (
        location &&
        typeof location.latitude === 'number' &&
        typeof location.longitude === 'number' &&
        !Number.isNaN(location.latitude) &&
        !Number.isNaN(location.longitude)
      ) {
        points.push({
          latitude: location.latitude,
          longitude: location.longitude,
          reportType: report.report_type,
        });
      }
    }

    return points;
  }

  /** Caminho sem filtro de formulário: INNER JOIN + IS NOT NULL (alinhado aos índices; evita LEFT JOIN do Prisma). */
  private async fetchReportPointsRaw(
    contextId: number,
    startDate: Date,
    endDate: Date,
    take: number,
  ): Promise<
    Array<{
      report_type: report_type_enum;
      occurrence_location: Prisma.JsonValue;
    }>
  > {
    const rows = await this.prisma.$queryRaw<
      Array<{ report_type: string; occurrence_location: Prisma.JsonValue }>
    >(Prisma.sql`
      SELECT r.report_type::text AS report_type, r.occurrence_location
      FROM report r
      INNER JOIN participation p ON p.id = r.participation_id
      WHERE r.active = true
        AND p.active = true
        AND p.context_id = ${contextId}
        AND r.created_at >= ${startDate}
        AND r.created_at <= ${endDate}
        AND r.occurrence_location IS NOT NULL
      ORDER BY r.created_at DESC
      LIMIT ${take}
    `);
    return rows.map((row) => ({
      report_type: row.report_type as report_type_enum,
      occurrence_location: row.occurrence_location,
    }));
  }

  async findContextReportStreaks(
    contextId: number,
    query: ReportStreakQueryDto,
    userId: number,
  ): Promise<ListResponseDto<ReportStreakSummaryResponseDto>> {
    const page = query.page || 1;
    const pageSize = query.pageSize || 20;
    const skip = (page - 1) * pageSize;

    const filterContextId = await this.authz.resolveListContextId(
      userId,
      contextId,
      'GET /contexts/:contextId/report-streaks',
    );

    const where: any = {
      context_id: filterContextId,
    };

    if (query.active !== undefined) {
      where.active = query.active;
    } else {
      where.active = true;
    }

    const searchTerm = query.search?.trim();
    if (searchTerm) {
      where.user = {
        OR: [
          { name: { contains: searchTerm, mode: 'insensitive' } },
          { email: { contains: searchTerm, mode: 'insensitive' } },
        ],
      };
    }

    const [participations, totalItems] = await Promise.all([
      this.prisma.participation.findMany({
        where,
        skip,
        take: pageSize,
        orderBy: { created_at: 'desc' },
        include: {
          user: {
            select: {
              name: true,
              email: true,
            },
          },
          participation_report_streak: true,
        },
      }),
      this.prisma.participation.count({ where }),
    ]);

    const baseUrl = `/v1/contexts/${filterContextId}/report-streaks`;
    const queryParams: Record<string, any> = {};
    if (query.active !== undefined) queryParams.active = query.active;
    if (query.search) queryParams.search = query.search;

    return {
      data: participations.map((participation) =>
        this.mapToReportStreakSummaryDto(participation),
      ),
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

  async findParticipationReportStreak(
    contextId: number,
    participationId: number,
    query: ParticipationReportStreakQueryDto,
    userId: number,
  ): Promise<ParticipationReportStreakResponseDto> {
    const filterContextId = await this.authz.resolveListContextId(
      userId,
      contextId,
      'GET /contexts/:contextId/report-streaks/:participationId',
      { allowParticipantContext: true },
    );

    if (query.startDate && query.endDate) {
      const startDate = this.parseDateOnly(query.startDate);
      const endDate = this.parseDateOnly(query.endDate);

      if (startDate > endDate) {
        throw new BadRequestException(
          'A data inicial deve ser anterior ou igual à data final',
        );
      }
    }

    const participation = await this.prisma.participation.findUnique({
      where: { id: participationId },
      include: {
        user: {
          select: {
            name: true,
            email: true,
          },
        },
        participation_report_streak: true,
      },
    });

    if (!participation) {
      throw new NotFoundException(
        `Participação com ID ${participationId} não encontrada`,
      );
    }

    if (participation.context_id !== filterContextId) {
      throw new BadRequestException(
        'A participação não pertence ao contexto informado',
      );
    }

    const isAdmin = await this.authz.isAdmin(userId);
    const canManage =
      isAdmin ||
      (await this.authz.hasAnyRole(userId, filterContextId, [
        'manager',
        'content_manager',
      ]));

    if (!canManage && participation.user_id !== userId) {
      throw new ForbiddenException(
        'Você só pode visualizar a própria ofensiva de reports',
      );
    }

    const dayWhere: any = {
      participation_id: participationId,
    };

    if (query.startDate || query.endDate) {
      dayWhere.report_date = {};

      if (query.startDate) {
        dayWhere.report_date.gte = this.parseDateOnly(query.startDate);
      }

      if (query.endDate) {
        dayWhere.report_date.lte = this.parseDateOnly(query.endDate);
      }
    }

    const reportedDays = await this.prisma.participation_report_day.findMany({
      where: dayWhere,
      orderBy: {
        report_date: 'asc',
      },
    });

    const summary = this.mapToReportStreakSummaryDto(participation);

    return {
      ...summary,
      periodStartDate:
        query.startDate ?? this.formatDateOnly(reportedDays[0]?.report_date),
      periodEndDate:
        query.endDate ??
        this.formatDateOnly(reportedDays[reportedDays.length - 1]?.report_date),
      reportedDaysInRangeCount: reportedDays.length,
      reportedDays: reportedDays.map((day) => ({
        date: this.formatDateOnly(day.report_date)!,
        reportCount: day.report_count,
        positiveCount: day.positive_count,
        negativeCount: day.negative_count,
      })),
    };
  }

  private mapToResponseDto(report: any): ReportResponseDto {
    return {
      id: report.id,
      participationId: report.participation_id,
      formVersionId: report.form_version_id,
      reportType: report.report_type,
      occurrenceLocation: report.occurrence_location,
      formResponse: report.form_response,
      active: report.active,
      createdAt: report.created_at,
      updatedAt: report.updated_at,
    };
  }
}
