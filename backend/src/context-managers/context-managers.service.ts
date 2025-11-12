import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateContextManagerDto } from './dto/create-context-manager.dto';
import { UpdateContextManagerDto } from './dto/update-context-manager.dto';
import { ContextManagerQueryDto } from './dto/context-manager-query.dto';
import { ContextManagerResponseDto } from './dto/context-manager-response.dto';
import { ListResponseDto } from '../common/dto/list-response.dto';
import {
  createPaginationMeta,
  createPaginationLinks,
} from '../common/helpers/pagination.helper';

@Injectable()
export class ContextManagersService {
  constructor(private prisma: PrismaService) {}

  async create(
    contextId: number,
    createContextManagerDto: CreateContextManagerDto,
  ): Promise<ContextManagerResponseDto> {
    // Validar contexto
    const context = await this.prisma.context.findUnique({
      where: { id: contextId },
    });

    if (!context) {
      throw new NotFoundException(`Contexto com ID ${contextId} não encontrado`);
    }

    // Validar usuário
    const user = await this.prisma.user.findUnique({
      where: { id: createContextManagerDto.userId },
    });

    if (!user) {
      throw new BadRequestException(
        `Usuário com ID ${createContextManagerDto.userId} não encontrado`,
      );
    }

    // Verificar se já existe manager para este contexto e usuário
    const existingManager = await this.prisma.context_manager.findFirst({
      where: {
        context_id: contextId,
        user_id: createContextManagerDto.userId,
      },
    });

    if (existingManager) {
      throw new ConflictException(
        `Usuário ${createContextManagerDto.userId} já é manager do contexto ${contextId}`,
      );
    }

    // Criar context manager
    const contextManager = await this.prisma.context_manager.create({
      data: {
        context_id: contextId,
        user_id: createContextManagerDto.userId,
        active: createContextManagerDto.active ?? true,
      },
    });

    return this.mapToResponseDto(contextManager);
  }

  async findAllByContext(
    contextId: number,
    query: ContextManagerQueryDto,
  ): Promise<ListResponseDto<ContextManagerResponseDto>> {
    // Validar contexto
    const context = await this.prisma.context.findUnique({
      where: { id: contextId },
    });

    if (!context) {
      throw new NotFoundException(`Contexto com ID ${contextId} não encontrado`);
    }

    const page = query.page || 1;
    const pageSize = query.pageSize || 20;
    const skip = (page - 1) * pageSize;

    // Construir filtros
    const where: any = {
      context_id: contextId,
    };

    if (query.active !== undefined) {
      where.active = query.active;
    } else {
      // Por padrão, mostrar apenas managers ativos
      where.active = true;
    }

    // Buscar managers e total
    const [managers, totalItems] = await Promise.all([
      this.prisma.context_manager.findMany({
        where,
        skip,
        take: pageSize,
        orderBy: { created_at: 'desc' },
      }),
      this.prisma.context_manager.count({ where }),
    ]);

    // Criar resposta paginada
    const baseUrl = `/v1/contexts/${contextId}/managers`;
    const queryParams: Record<string, any> = {};
    if (query.active !== undefined) queryParams.active = query.active;

    return {
      data: managers.map((manager) => this.mapToResponseDto(manager)),
      meta: createPaginationMeta({ page, pageSize, totalItems, baseUrl, queryParams }),
      links: createPaginationLinks({ page, pageSize, totalItems, baseUrl, queryParams }),
    };
  }

  async findOne(contextId: number, id: number): Promise<ContextManagerResponseDto> {
    // Validar contexto
    const context = await this.prisma.context.findUnique({
      where: { id: contextId },
    });

    if (!context) {
      throw new NotFoundException(`Contexto com ID ${contextId} não encontrado`);
    }

    const contextManager = await this.prisma.context_manager.findFirst({
      where: {
        id,
        context_id: contextId,
      },
    });

    if (!contextManager) {
      throw new NotFoundException(
        `Context manager com ID ${id} não encontrado no contexto ${contextId}`,
      );
    }

    return this.mapToResponseDto(contextManager);
  }

  async update(
    contextId: number,
    id: number,
    updateContextManagerDto: UpdateContextManagerDto,
  ): Promise<ContextManagerResponseDto> {
    // Verificar se context manager existe e pertence ao contexto
    const existingManager = await this.prisma.context_manager.findFirst({
      where: {
        id,
        context_id: contextId,
      },
    });

    if (!existingManager) {
      throw new NotFoundException(
        `Context manager com ID ${id} não encontrado no contexto ${contextId}`,
      );
    }

    // Preparar dados de atualização
    const updateData: any = {};

    if (updateContextManagerDto.active !== undefined) {
      updateData.active = updateContextManagerDto.active;
    }

    // Atualizar context manager
    const contextManager = await this.prisma.context_manager.update({
      where: { id },
      data: updateData,
    });

    return this.mapToResponseDto(contextManager);
  }

  async remove(contextId: number, id: number): Promise<void> {
    // Verificar se context manager existe e pertence ao contexto
    const contextManager = await this.prisma.context_manager.findFirst({
      where: {
        id,
        context_id: contextId,
      },
    });

    if (!contextManager) {
      throw new NotFoundException(
        `Context manager com ID ${id} não encontrado no contexto ${contextId}`,
      );
    }

    // Soft delete - apenas desativar
    await this.prisma.context_manager.update({
      where: { id },
      data: { active: false },
    });
  }

  private mapToResponseDto(contextManager: any): ContextManagerResponseDto {
    return {
      id: contextManager.id,
      userId: contextManager.user_id,
      contextId: contextManager.context_id,
      active: contextManager.active,
      createdAt: contextManager.created_at,
      updatedAt: contextManager.updated_at,
    };
  }
}

