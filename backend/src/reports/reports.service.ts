import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuthzService } from '../authz/authz.service';
import { CreateReportDto } from './dto/create-report.dto';
import { UpdateReportDto } from './dto/update-report.dto';
import { ReportQueryDto } from './dto/report-query.dto';
import { ReportResponseDto } from './dto/report-response.dto';
import { ReportsPointsQueryDto } from './dto/reports-points-query.dto';
import { ReportPointResponseDto } from './dto/report-point-response.dto';
import { ListResponseDto } from '../common/dto/list-response.dto';
import {
  createPaginationMeta,
  createPaginationLinks,
} from '../common/helpers/pagination.helper';

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
  private async assertCanManageReport(userId: number, reportContextId: number): Promise<void> {
    const isAdmin = await this.authz.isAdmin(userId);
    if (isAdmin) return;
    const canManage = await this.authz.hasAnyRole(userId, reportContextId, ['manager', 'content_manager']);
    if (!canManage) {
      throw new ForbiddenException('Você não tem permissão para acessar este report');
    }
  }

  async create(createReportDto: CreateReportDto, userId: number): Promise<ReportResponseDto> {
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
      const canManage = await this.authz.hasAnyRole(userId, participation.context_id, ['manager', 'content_manager']);
      if (!canManage) {
        throw new ForbiddenException('Você não pode criar um report para a participação de outro usuário');
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

    // Criar report
    const report = await this.prisma.report.create({ data });

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

    await this.assertCanManageReport(userId, (report as any).participation.context_id);

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

    await this.assertCanManageReport(userId, (existingReport as any).participation.context_id);

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

    await this.assertCanManageReport(userId, (report as any).participation.context_id);

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
      occurrence_location: {
        not: null,
      },
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

    const reports = await this.prisma.report.findMany({
      where: whereClause,
      select: {
        report_type: true,
        occurrence_location: true,
      },
    });

    // Filtrar e mapear apenas reports com latitude e longitude válidas
    const points: ReportPointResponseDto[] = [];

    for (const report of reports) {
      const location = report.occurrence_location as any;

      // Verificar se location tem latitude e longitude
      if (
        location &&
        typeof location.latitude === 'number' &&
        typeof location.longitude === 'number' &&
        !isNaN(location.latitude) &&
        !isNaN(location.longitude)
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
