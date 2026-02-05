import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateContextDto } from './dto/create-context.dto';
import { UpdateContextDto } from './dto/update-context.dto';
import { ContextQueryDto } from './dto/context-query.dto';
import { ContextResponseDto } from './dto/context-response.dto';
import { ListResponseDto } from '../common/dto/list-response.dto';
import {
  createPaginationMeta,
  createPaginationLinks,
} from '../common/helpers/pagination.helper';

@Injectable()
export class ContextsService {
  constructor(private prisma: PrismaService) {}

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

    // Criar contexto
    const context = await this.prisma.context.create({ data });

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

    // Buscar contextos e total
    const [contexts, totalItems] = await Promise.all([
      this.prisma.context.findMany({
        where,
        skip,
        take: pageSize,
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

  async findOne(id: number): Promise<ContextResponseDto> {
    const context = await this.prisma.context.findUnique({
      where: { id },
    });

    if (!context) {
      throw new NotFoundException(`Contexto com ID ${id} não encontrado`);
    }

    return this.mapToResponseDto(context);
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

    // Atualizar contexto
    const context = await this.prisma.context.update({
      where: { id },
      data: updateData,
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
    };
  }
}
