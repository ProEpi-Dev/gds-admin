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

