import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
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
  constructor(private prisma: PrismaService) {}

  async create(createReportDto: CreateReportDto): Promise<ReportResponseDto> {
    // Validar participação
    const participation = await this.prisma.participation.findUnique({
      where: { id: createReportDto.participationId },
    });

    if (!participation) {
      throw new BadRequestException(
        `Participação com ID ${createReportDto.participationId} não encontrada`,
      );
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

  async findAll(query: ReportQueryDto): Promise<ListResponseDto<ReportResponseDto>> {
    const page = query.page || 1;
    const pageSize = query.pageSize || 20;
    const skip = (page - 1) * pageSize;

    // Construir filtros
    const where: any = {};

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
    if (query.participationId !== undefined) queryParams.participationId = query.participationId;
    if (query.formVersionId !== undefined) queryParams.formVersionId = query.formVersionId;
    if (query.reportType !== undefined) queryParams.reportType = query.reportType;

    return {
      data: reports.map((report) => this.mapToResponseDto(report)),
      meta: createPaginationMeta({ page, pageSize, totalItems, baseUrl, queryParams }),
      links: createPaginationLinks({ page, pageSize, totalItems, baseUrl, queryParams }),
    };
  }

  async findOne(id: number): Promise<ReportResponseDto> {
    const report = await this.prisma.report.findUnique({
      where: { id },
    });

    if (!report) {
      throw new NotFoundException(`Report com ID ${id} não encontrado`);
    }

    return this.mapToResponseDto(report);
  }

  async update(id: number, updateReportDto: UpdateReportDto): Promise<ReportResponseDto> {
    // Verificar se report existe
    const existingReport = await this.prisma.report.findUnique({
      where: { id },
    });

    if (!existingReport) {
      throw new NotFoundException(`Report com ID ${id} não encontrado`);
    }

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

  async remove(id: number): Promise<void> {
    // Verificar se report existe
    const report = await this.prisma.report.findUnique({
      where: { id },
    });

    if (!report) {
      throw new NotFoundException(`Report com ID ${id} não encontrado`);
    }

    // Soft delete - apenas desativar
    await this.prisma.report.update({
      where: { id },
      data: { active: false },
    });
  }

  async findPoints(
    query: ReportsPointsQueryDto,
    userId: number,
  ): Promise<ReportPointResponseDto[]> {
    // Buscar participação ativa do usuário para obter o contexto
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    today.setMinutes(0);
    today.setSeconds(0);
    today.setMilliseconds(0);

    const participations = await this.prisma.participation.findMany({
      where: {
        user_id: userId,
        active: true,
      },
      orderBy: {
        created_at: 'desc',
      },
    });

    // Filtrar participação ativa por data
    const activeParticipation = participations.find((participation) => {
      const startDate = new Date(participation.start_date);
      startDate.setHours(0, 0, 0, 0);
      startDate.setMinutes(0);
      startDate.setSeconds(0);
      startDate.setMilliseconds(0);

      if (startDate > today) {
        return false;
      }

      if (!participation.end_date) {
        return true;
      }

      const endDate = new Date(participation.end_date);
      endDate.setHours(0, 0, 0, 0);
      endDate.setMinutes(0);
      endDate.setSeconds(0);
      endDate.setMilliseconds(0);

      return endDate >= today;
    });

    if (!activeParticipation) {
      // Se não houver participação ativa, retornar array vazio
      return [];
    }

    const contextId = activeParticipation.context_id;

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

    // Buscar reports do contexto do usuário
    // Filtrar por participações do contexto e, se fornecido, pelo formId
    const whereClause: any = {
      active: true,
      created_at: {
        gte: startDate,
        lte: endDate,
      },
      participation: {
        context_id: contextId,
        active: true,
      },
      occurrence_location: {
        not: null,
      },
    };

    // Se formId foi fornecido, filtrar também por formulário
    if (query.formId) {
      whereClause.form_version = {
        form_id: query.formId,
        active: true,
      };
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

