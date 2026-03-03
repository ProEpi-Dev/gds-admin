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

/**
 * Serviço de gerentes de contexto.
 * Armazenamento migrado de context_manager para participation + participation_role (role: manager).
 * O "id" exposto na API corresponde ao participation.id.
 */
@Injectable()
export class ContextManagersService {
  constructor(private readonly prisma: PrismaService) {}

  async create(
    contextId: number,
    createContextManagerDto: CreateContextManagerDto,
  ): Promise<ContextManagerResponseDto> {
    const context = await this.prisma.context.findUnique({
      where: { id: contextId },
    });
    if (!context) {
      throw new NotFoundException(`Contexto com ID ${contextId} não encontrado`);
    }

    const user = await this.prisma.user.findUnique({
      where: { id: createContextManagerDto.userId },
    });
    if (!user) {
      throw new BadRequestException(
        `Usuário com ID ${createContextManagerDto.userId} não encontrado`,
      );
    }

    const managerRole = await this.prisma.role.findUnique({
      where: { code: 'manager' },
    });
    if (!managerRole) {
      throw new BadRequestException(
        'Papel "manager" não encontrado. Execute as migrações RBAC.',
      );
    }

    const existingRole = await this.prisma.participation_role.findFirst({
      where: {
        participation: {
          user_id: createContextManagerDto.userId,
          context_id: contextId,
        },
        role_id: managerRole.id,
      },
    });
    if (existingRole) {
      throw new ConflictException(
        `Usuário ${createContextManagerDto.userId} já é manager do contexto ${contextId}`,
      );
    }

    const participation = await this.prisma.$transaction(async (tx) => {
      let p = await tx.participation.findFirst({
        where: {
          user_id: createContextManagerDto.userId,
          context_id: contextId,
        },
      });
      if (!p) {
        p = await tx.participation.create({
          data: {
            user_id: createContextManagerDto.userId,
            context_id: contextId,
            start_date: new Date(),
            end_date: null,
            active: createContextManagerDto.active ?? true,
          },
        });
      } else if (
        createContextManagerDto.active !== undefined &&
        p.active !== createContextManagerDto.active
      ) {
        p = await tx.participation.update({
          where: { id: p.id },
          data: { active: createContextManagerDto.active },
        });
      }
      await tx.participation_role.create({
        data: {
          participation_id: p.id,
          role_id: managerRole.id,
        },
      });
      return p;
    });

    return this.mapToResponseDto(participation, true);
  }

  async findAllByContext(
    contextId: number,
    query: ContextManagerQueryDto,
  ): Promise<ListResponseDto<ContextManagerResponseDto>> {
    const context = await this.prisma.context.findUnique({
      where: { id: contextId },
    });
    if (!context) {
      throw new NotFoundException(`Contexto com ID ${contextId} não encontrado`);
    }

    const page = query.page || 1;
    const pageSize = query.pageSize || 20;
    const skip = (page - 1) * pageSize;

    const managerRole = await this.prisma.role.findUnique({
      where: { code: 'manager' },
    });

    const baseWhere: any = {
      context_id: contextId,
      participation_role: {
        some: {
          role_id: managerRole?.id ?? -1,
        },
      },
    };

    if (query.active !== undefined) {
      baseWhere.active = query.active;
    } else {
      baseWhere.active = true;
    }

    const [participations, totalItems] = await Promise.all([
      this.prisma.participation.findMany({
        where: baseWhere,
        skip,
        take: pageSize,
        orderBy: { created_at: 'desc' },
      }),
      this.prisma.participation.count({ where: baseWhere }),
    ]);

    const baseUrl = `/v1/contexts/${contextId}/managers`;
    const queryParams: Record<string, any> = {};
    if (query.active !== undefined) queryParams.active = query.active;

    return {
      data: participations.map((p) => this.mapToResponseDto(p, true)),
      meta: createPaginationMeta({ page, pageSize, totalItems, baseUrl, queryParams }),
      links: createPaginationLinks({ page, pageSize, totalItems, baseUrl, queryParams }),
    };
  }

  async findOne(contextId: number, id: number): Promise<ContextManagerResponseDto> {
    const context = await this.prisma.context.findUnique({
      where: { id: contextId },
    });
    if (!context) {
      throw new NotFoundException(`Contexto com ID ${contextId} não encontrado`);
    }

    const managerRole = await this.prisma.role.findUnique({
      where: { code: 'manager' },
    });

    const participation = await this.prisma.participation.findFirst({
      where: {
        id,
        context_id: contextId,
        participation_role: {
          some: { role_id: managerRole?.id ?? -1 },
        },
      },
    });

    if (!participation) {
      throw new NotFoundException(
        `Manager com ID ${id} não encontrado no contexto ${contextId}`,
      );
    }

    return this.mapToResponseDto(participation, true);
  }

  async update(
    contextId: number,
    id: number,
    updateContextManagerDto: UpdateContextManagerDto,
  ): Promise<ContextManagerResponseDto> {
    const managerRole = await this.prisma.role.findUnique({
      where: { code: 'manager' },
    });

    const participation = await this.prisma.participation.findFirst({
      where: {
        id,
        context_id: contextId,
        participation_role: {
          some: { role_id: managerRole?.id ?? -1 },
        },
      },
    });

    if (!participation) {
      throw new NotFoundException(
        `Manager com ID ${id} não encontrado no contexto ${contextId}`,
      );
    }

    if (updateContextManagerDto.active !== undefined) {
      await this.prisma.participation.update({
        where: { id },
        data: { active: updateContextManagerDto.active },
      });
      participation.active = updateContextManagerDto.active;
    }

    return this.mapToResponseDto(participation, updateContextManagerDto.active ?? participation.active);
  }

  async remove(contextId: number, id: number): Promise<void> {
    const managerRole = await this.prisma.role.findUnique({
      where: { code: 'manager' },
    });

    const participation = await this.prisma.participation.findFirst({
      where: {
        id,
        context_id: contextId,
        participation_role: {
          some: { role_id: managerRole?.id ?? -1 },
        },
      },
    });

    if (!participation) {
      throw new NotFoundException(
        `Manager com ID ${id} não encontrado no contexto ${contextId}`,
      );
    }

    await this.prisma.participation_role.deleteMany({
      where: {
        participation_id: id,
        role_id: managerRole?.id,
      },
    });
  }

  private mapToResponseDto(participation: any, active: boolean): ContextManagerResponseDto {
    return {
      id: participation.id,
      userId: participation.user_id,
      contextId: participation.context_id,
      active,
      createdAt: participation.created_at,
      updatedAt: participation.updated_at,
    };
  }
}
