import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateParticipationDto } from './dto/create-participation.dto';
import { UpdateParticipationDto } from './dto/update-participation.dto';
import { ParticipationQueryDto } from './dto/participation-query.dto';
import { ParticipationResponseDto } from './dto/participation-response.dto';
import { ListResponseDto } from '../common/dto/list-response.dto';
import {
  createPaginationMeta,
  createPaginationLinks,
} from '../common/helpers/pagination.helper';

@Injectable()
export class ParticipationsService {
  constructor(private prisma: PrismaService) {}

  async create(
    createParticipationDto: CreateParticipationDto,
  ): Promise<ParticipationResponseDto> {
    // Validar usuário
    const user = await this.prisma.user.findUnique({
      where: { id: createParticipationDto.userId },
    });

    if (!user) {
      throw new BadRequestException(
        `Usuário com ID ${createParticipationDto.userId} não encontrado`,
      );
    }

    // Validar contexto
    const context = await this.prisma.context.findUnique({
      where: { id: createParticipationDto.contextId },
    });

    if (!context) {
      throw new BadRequestException(
        `Contexto com ID ${createParticipationDto.contextId} não encontrado`,
      );
    }

    // Validar datas
    const startDate = new Date(createParticipationDto.startDate);
    let endDate: Date | null = null;

    if (createParticipationDto.endDate) {
      endDate = new Date(createParticipationDto.endDate);

      if (endDate < startDate) {
        throw new BadRequestException(
          'Data de término deve ser posterior à data de início',
        );
      }
    }

    // Preparar dados
    const data: any = {
      user_id: createParticipationDto.userId,
      context_id: createParticipationDto.contextId,
      start_date: startDate,
      active: createParticipationDto.active ?? true,
    };

    if (endDate) {
      data.end_date = endDate;
    }

    // Criar participação
    const participation = await this.prisma.participation.create({ data });

    return this.mapToResponseDto(participation);
  }

  async findAll(
    query: ParticipationQueryDto,
  ): Promise<ListResponseDto<ParticipationResponseDto>> {
    const page = query.page || 1;
    const pageSize = query.pageSize || 20;
    const skip = (page - 1) * pageSize;

    // Construir filtros
    const where: any = {};

    if (query.active !== undefined) {
      where.active = query.active;
    } else {
      // Por padrão, mostrar apenas participações ativas
      where.active = true;
    }

    if (query.userId !== undefined) {
      where.user_id = query.userId;
    }

    if (query.contextId !== undefined) {
      where.context_id = query.contextId;
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

    const includeUser = query.includeUser === true;

    // Buscar participações e total
    const [participations, totalItems] = await Promise.all([
      this.prisma.participation.findMany({
        where,
        skip,
        take: pageSize,
        orderBy: { created_at: 'desc' },
        include: includeUser
          ? {
              user: {
                select: { name: true, email: true },
              },
            }
          : undefined,
      }),
      this.prisma.participation.count({ where }),
    ]);

    // Criar resposta paginada
    const baseUrl = '/v1/participations';
    const queryParams: Record<string, any> = {};
    if (query.active !== undefined) queryParams.active = query.active;
    if (query.userId !== undefined) queryParams.userId = query.userId;
    if (query.contextId !== undefined) queryParams.contextId = query.contextId;
    if (query.includeUser !== undefined)
      queryParams.includeUser = query.includeUser;
    if (query.search !== undefined) queryParams.search = query.search;

    return {
      data: participations.map((participation) =>
        this.mapToResponseDto(participation, includeUser),
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

  async findOne(id: number): Promise<ParticipationResponseDto> {
    const participation = await this.prisma.participation.findUnique({
      where: { id },
      include: {
        user: { select: { name: true, email: true } },
      },
    });

    if (!participation) {
      throw new NotFoundException(`Participação com ID ${id} não encontrada`);
    }

    return this.mapToResponseDto(participation, true);
  }

  async update(
    id: number,
    updateParticipationDto: UpdateParticipationDto,
  ): Promise<ParticipationResponseDto> {
    // Verificar se participação existe
    const existingParticipation = await this.prisma.participation.findUnique({
      where: { id },
    });

    if (!existingParticipation) {
      throw new NotFoundException(`Participação com ID ${id} não encontrada`);
    }

    // Validar usuário se fornecido
    if (updateParticipationDto.userId !== undefined) {
      const user = await this.prisma.user.findUnique({
        where: { id: updateParticipationDto.userId },
      });

      if (!user) {
        throw new BadRequestException(
          `Usuário com ID ${updateParticipationDto.userId} não encontrado`,
        );
      }
    }

    // Validar contexto se fornecido
    if (updateParticipationDto.contextId !== undefined) {
      const context = await this.prisma.context.findUnique({
        where: { id: updateParticipationDto.contextId },
      });

      if (!context) {
        throw new BadRequestException(
          `Contexto com ID ${updateParticipationDto.contextId} não encontrado`,
        );
      }
    }

    // Validar datas
    let startDate = existingParticipation.start_date;
    let endDate = existingParticipation.end_date;

    if (updateParticipationDto.startDate) {
      startDate = new Date(updateParticipationDto.startDate);
    }

    if (updateParticipationDto.endDate !== undefined) {
      if (updateParticipationDto.endDate === null) {
        endDate = null;
      } else {
        endDate = new Date(updateParticipationDto.endDate);
      }
    }

    if (endDate && startDate && endDate < startDate) {
      throw new BadRequestException(
        'Data de término deve ser posterior à data de início',
      );
    }

    // Preparar dados de atualização
    const updateData: any = {};

    if (updateParticipationDto.userId !== undefined) {
      updateData.user_id = updateParticipationDto.userId;
    }

    if (updateParticipationDto.contextId !== undefined) {
      updateData.context_id = updateParticipationDto.contextId;
    }

    if (updateParticipationDto.startDate !== undefined) {
      updateData.start_date = startDate;
    }

    if (updateParticipationDto.endDate !== undefined) {
      updateData.end_date = endDate;
    }

    if (updateParticipationDto.active !== undefined) {
      updateData.active = updateParticipationDto.active;
    }

    // Atualizar participação
    const participation = await this.prisma.participation.update({
      where: { id },
      data: updateData,
    });

    return this.mapToResponseDto(participation);
  }

  async remove(id: number): Promise<void> {
    // Verificar se participação existe
    const participation = await this.prisma.participation.findUnique({
      where: { id },
    });

    if (!participation) {
      throw new NotFoundException(`Participação com ID ${id} não encontrada`);
    }

    // Verificar se há reports associados
    const reports = await this.prisma.report.count({
      where: { participation_id: id },
    });

    if (reports > 0) {
      throw new BadRequestException(
        `Não é possível deletar participação com ${reports} report(s) associado(s)`,
      );
    }

    // Soft delete - apenas desativar
    await this.prisma.participation.update({
      where: { id },
      data: { active: false },
    });
  }

  private mapToResponseDto(
    participation: any,
    includeUser = false,
  ): ParticipationResponseDto {
    const dto: ParticipationResponseDto = {
      id: participation.id,
      userId: participation.user_id,
      contextId: participation.context_id,
      startDate: participation.start_date,
      endDate: participation.end_date,
      active: participation.active,
      createdAt: participation.created_at,
      updatedAt: participation.updated_at,
    };
    if (includeUser && participation.user) {
      dto.userName = participation.user.name;
      dto.userEmail = participation.user.email;
    }
    return dto;
  }
}
