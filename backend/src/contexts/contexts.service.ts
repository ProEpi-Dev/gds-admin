import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { ReportsService } from '../reports/reports.service';
import { CreateContextDto } from './dto/create-context.dto';
import { UpdateContextDto } from './dto/update-context.dto';
import { ContextQueryDto } from './dto/context-query.dto';
import { ContextResponseDto } from './dto/context-response.dto';
import { context_module_code } from '@prisma/client';
import { ListResponseDto } from '../common/dto/list-response.dto';
import { ReportStreakQueryDto } from '../reports/dto/report-streak-query.dto';
import { ReportStreakSummaryResponseDto } from '../reports/dto/report-streak-summary-response.dto';
import { ParticipationReportStreakQueryDto } from '../reports/dto/participation-report-streak-query.dto';
import { ParticipationReportStreakResponseDto } from '../reports/dto/participation-report-streak-response.dto';
import {
  createPaginationMeta,
  createPaginationLinks,
} from '../common/helpers/pagination.helper';
import { ContextConfigurationEntryDto } from './dto/context-configuration-entry.dto';

@Injectable()
export class ContextsService {
  constructor(
    private prisma: PrismaService,
    private reportsService: ReportsService,
  ) {}

  async create(
    createContextDto: CreateContextDto,
  ): Promise<ContextResponseDto> {
    // Validar location_id se fornecido
    if (createContextDto.locationId !== undefined) {
      const location = await this.prisma.location.findUnique({
        where: { id: createContextDto.locationId },
      });

      if (!location) {
        throw new BadRequestException(
          `Localização com ID ${createContextDto.locationId} não encontrada`,
        );
      }
    }

    // Preparar dados
    const data: any = {
      name: createContextDto.name,
      access_type: createContextDto.accessType,
      active: createContextDto.active ?? true,
    };

    if (createContextDto.locationId !== undefined) {
      data.location_id = createContextDto.locationId;
    }

    if (createContextDto.description !== undefined) {
      data.description = createContextDto.description;
    }

    if (createContextDto.type !== undefined) {
      data.type = createContextDto.type;
    }

    const modules = this.normalizeModules(createContextDto.modules);
    if (modules.length > 0) {
      data.context_module = {
        create: modules.map((moduleCode) => ({
          module_code: moduleCode,
        })),
      };
    }

    // Criar contexto
    const context = await this.prisma.context.create({
      data,
      include: {
        context_module: true,
      },
    });

    return this.mapToResponseDto(context);
  }

  async findAll(
    query: ContextQueryDto,
  ): Promise<ListResponseDto<ContextResponseDto>> {
    const page = query.page || 1;
    const pageSize = query.pageSize || 20;
    const skip = (page - 1) * pageSize;

    // Construir filtros
    const where: any = {};

    if (query.active !== undefined) {
      where.active = query.active;
    } else {
      // Por padrão, mostrar apenas contextos ativos
      where.active = true;
    }

    if (query.locationId !== undefined) {
      where.location_id = query.locationId;
    }

    if (query.accessType !== undefined) {
      where.access_type = query.accessType;
    }

    if (query.search) {
      where.name = { contains: query.search, mode: 'insensitive' };
    }

    // Buscar contextos e total
    const [contexts, totalItems] = await Promise.all([
      this.prisma.context.findMany({
        where,
        skip,
        take: pageSize,
        include: {
          context_module: true,
        },
        orderBy: { created_at: 'desc' },
      }),
      this.prisma.context.count({ where }),
    ]);

    // Criar resposta paginada
    const baseUrl = '/v1/contexts';
    const queryParams: Record<string, any> = {};
    if (query.active !== undefined) queryParams.active = query.active;
    if (query.locationId !== undefined)
      queryParams.locationId = query.locationId;
    if (query.accessType !== undefined)
      queryParams.accessType = query.accessType;
    if (query.search) queryParams.search = query.search;

    return {
      data: contexts.map((context) => this.mapToResponseDto(context)),
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

  /** Lista contextos públicos e ativos para uso no signup (sem autenticação). */
  async findPublicForSignup(): Promise<ListResponseDto<ContextResponseDto>> {
    const contexts = await this.prisma.context.findMany({
      where: { access_type: 'PUBLIC', active: true },
      include: {
        context_module: true,
      },
      orderBy: { name: 'asc' },
    });
    const totalItems = contexts.length;
    const pageSize = Math.max(totalItems, 1);
    return {
      data: contexts.map((context) => this.mapToResponseDto(context)),
      meta: createPaginationMeta({
        page: 1,
        pageSize,
        totalItems,
        baseUrl: '/v1/contexts/public',
      }),
      links: createPaginationLinks({
        page: 1,
        pageSize,
        totalItems,
        baseUrl: '/v1/contexts/public',
      }),
    };
  }

  async findOne(id: number): Promise<ContextResponseDto> {
    const context = await this.prisma.context.findUnique({
      where: { id },
      include: {
        context_module: true,
      },
    });

    if (!context) {
      throw new NotFoundException(`Contexto com ID ${id} não encontrado`);
    }

    return this.mapToResponseDto(context);
  }

  async findReportStreaks(
    contextId: number,
    query: ReportStreakQueryDto,
    userId: number,
  ): Promise<ListResponseDto<ReportStreakSummaryResponseDto>> {
    return this.reportsService.findContextReportStreaks(
      contextId,
      query,
      userId,
    );
  }

  async findParticipationReportStreak(
    contextId: number,
    participationId: number,
    query: ParticipationReportStreakQueryDto,
    userId: number,
  ): Promise<ParticipationReportStreakResponseDto> {
    return this.reportsService.findParticipationReportStreak(
      contextId,
      participationId,
      query,
      userId,
    );
  }

  async update(
    id: number,
    updateContextDto: UpdateContextDto,
  ): Promise<ContextResponseDto> {
    // Verificar se contexto existe
    const existingContext = await this.prisma.context.findUnique({
      where: { id },
    });

    if (!existingContext) {
      throw new NotFoundException(`Contexto com ID ${id} não encontrado`);
    }

    // Validar location_id se fornecido
    if (updateContextDto.locationId !== undefined) {
      const location = await this.prisma.location.findUnique({
        where: { id: updateContextDto.locationId },
      });

      if (!location) {
        throw new BadRequestException(
          `Localização com ID ${updateContextDto.locationId} não encontrada`,
        );
      }
    }

    // Preparar dados de atualização
    const updateData: any = {};

    if (updateContextDto.name !== undefined) {
      updateData.name = updateContextDto.name;
    }

    if (updateContextDto.locationId !== undefined) {
      updateData.location_id = updateContextDto.locationId;
    }

    if (updateContextDto.accessType !== undefined) {
      updateData.access_type = updateContextDto.accessType;
    }

    if (updateContextDto.description !== undefined) {
      updateData.description = updateContextDto.description;
    }

    if (updateContextDto.type !== undefined) {
      updateData.type = updateContextDto.type;
    }

    if (updateContextDto.active !== undefined) {
      updateData.active = updateContextDto.active;
    }

    if (updateContextDto.modules !== undefined) {
      const modules = this.normalizeModules(updateContextDto.modules);
      updateData.context_module = {
        deleteMany: {},
        create: modules.map((moduleCode) => ({
          module_code: moduleCode,
        })),
      };
    }

    // Atualizar contexto
    const context = await this.prisma.context.update({
      where: { id },
      data: updateData,
      include: {
        context_module: true,
      },
    });

    return this.mapToResponseDto(context);
  }

  async remove(id: number): Promise<void> {
    // Verificar se contexto existe
    const context = await this.prisma.context.findUnique({
      where: { id },
    });

    if (!context) {
      throw new NotFoundException(`Contexto com ID ${id} não encontrado`);
    }

    // Verificar se há participações associadas
    const participations = await this.prisma.participation.count({
      where: { context_id: id },
    });

    if (participations > 0) {
      throw new BadRequestException(
        `Não é possível deletar contexto com ${participations} participação(ões) associada(s)`,
      );
    }

    // Verificar se há formulários associados
    const forms = await this.prisma.form.count({
      where: { context_id: id },
    });

    if (forms > 0) {
      throw new BadRequestException(
        `Não é possível deletar contexto com ${forms} formulário(s) associado(s)`,
      );
    }

    // Soft delete - apenas desativar
    await this.prisma.context.update({
      where: { id },
      data: { active: false },
    });
  }

  async findConfiguration(
    contextId: number,
  ): Promise<ContextConfigurationEntryDto[]> {
    await this.ensureContextExists(contextId);

    const rows = await this.prisma.context_configuration.findMany({
      where: { context_id: contextId },
      orderBy: { key: 'asc' },
    });

    return rows.map((row) => this.mapConfigurationRow(row));
  }

  async upsertConfiguration(
    contextId: number,
    rawKey: string,
    value: unknown,
  ): Promise<ContextConfigurationEntryDto> {
    await this.ensureContextExists(contextId);

    const key = this.normalizeConfigurationKey(rawKey);
    this.validateConfigurationValue(key, value);

    let jsonValue = value as Prisma.InputJsonValue;
    if (
      key === 'negative_report_dedup_window_min' ||
      key === 'negative_block_if_positive_within_min'
    ) {
      const n =
        typeof value === 'number'
          ? value
          : typeof value === 'string'
            ? Number(value)
            : NaN;
      jsonValue = Math.floor(n) as unknown as Prisma.InputJsonValue;
    }

    const existing = await this.prisma.context_configuration.findFirst({
      where: { context_id: contextId, key },
    });

    const row = existing
      ? await this.prisma.context_configuration.update({
          where: { id: existing.id },
          data: {
            value: jsonValue,
            updated_at: new Date(),
          },
        })
      : await this.prisma.context_configuration.create({
          data: {
            context_id: contextId,
            key,
            value: jsonValue,
          },
        });

    return this.mapConfigurationRow(row);
  }

  private async ensureContextExists(contextId: number): Promise<void> {
    const context = await this.prisma.context.findUnique({
      where: { id: contextId },
      select: { id: true },
    });
    if (!context) {
      throw new NotFoundException(
        `Contexto com ID ${contextId} não encontrado`,
      );
    }
  }

  private normalizeConfigurationKey(rawKey: string): string {
    const key = decodeURIComponent(rawKey ?? '').trim();
    if (key.length === 0 || key.length > 100) {
      throw new BadRequestException('Chave de configuração inválida');
    }
    if (!/^[a-z0-9_]+$/.test(key)) {
      throw new BadRequestException(
        'Chave deve conter apenas letras minúsculas, números e underscore (máx. 100)',
      );
    }
    return key;
  }

  private validateConfigurationValue(key: string, value: unknown): void {
    if (value === undefined) {
      throw new BadRequestException('Valor indefinido não é permitido');
    }

    const numericKeys = new Set([
      'negative_report_dedup_window_min',
      'negative_block_if_positive_within_min',
    ]);

    if (numericKeys.has(key)) {
      const n =
        typeof value === 'number'
          ? value
          : typeof value === 'string'
            ? Number(value)
            : NaN;
      if (
        !Number.isFinite(n) ||
        Math.floor(n) !== n ||
        n <= 0 ||
        n > 2147483647
      ) {
        throw new BadRequestException(
          `A chave "${key}" exige um número inteiro positivo`,
        );
      }
      return;
    }

    if (key === 'allowed_email_domains') {
      if (!Array.isArray(value)) {
        throw new BadRequestException(
          'allowed_email_domains deve ser um array de strings (domínios)',
        );
      }
      for (const item of value) {
        if (typeof item !== 'string') {
          throw new BadRequestException(
            'allowed_email_domains: cada item deve ser string',
          );
        }
      }
      return;
    }

    const booleanConfigKeys = new Set([
      'social_sso_enabled',
      'profile_require_gender',
      'profile_require_country',
      'profile_require_location',
      'profile_require_external_identifier',
      'profile_require_phone',
    ]);
    if (booleanConfigKeys.has(key)) {
      if (typeof value !== 'boolean') {
        throw new BadRequestException(
          `A chave "${key}" exige valor booleano (true/false)`,
        );
      }
    }
  }

  private mapConfigurationRow(row: {
    id: number;
    key: string;
    value: Prisma.JsonValue;
    created_at: Date;
    updated_at: Date;
  }): ContextConfigurationEntryDto {
    return {
      id: row.id,
      key: row.key,
      value: row.value as unknown,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }

  private mapToResponseDto(context: any): ContextResponseDto {
    return {
      id: context.id,
      locationId: context.location_id,
      name: context.name,
      description: context.description,
      type: context.type,
      accessType: context.access_type,
      active: context.active,
      createdAt: context.created_at,
      updatedAt: context.updated_at,
      modules: this.normalizeModules(
        (context.context_module ?? []).map((item: any) => item.module_code),
      ),
    };
  }

  private normalizeModules(
    modules?: context_module_code[] | string[],
  ): context_module_code[] {
    if (!Array.isArray(modules)) return [];
    return [...new Set(modules as context_module_code[])].sort((a, b) =>
      a.localeCompare(b),
    ) as context_module_code[];
  }
}
