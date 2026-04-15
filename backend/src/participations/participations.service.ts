import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
  Logger,
} from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { BCRYPT_ROUNDS } from '../auth/constants/password.constants';
import { PrismaService } from '../prisma/prisma.service';
import { AuthzService } from '../authz/authz.service';
import { CreateParticipationDto } from './dto/create-participation.dto';
import { UpdateParticipationDto } from './dto/update-participation.dto';
import { ParticipationQueryDto } from './dto/participation-query.dto';
import { ParticipationResponseDto } from './dto/participation-response.dto';
import { ListResponseDto } from '../common/dto/list-response.dto';
import { RoleResponseDto } from '../roles/dto/role-response.dto';
import {
  createPaginationMeta,
  createPaginationLinks,
} from '../common/helpers/pagination.helper';
import { Prisma } from '@prisma/client';
import { BusinessMetricsService } from '../telemetry/business-metrics.service';

function participationListOrderBy(
  sort?: string,
): Prisma.participationOrderByWithRelationInput[] {
  switch (sort) {
    case 'name_asc':
      return [{ user: { name: 'asc' } }, { id: 'asc' }];
    case 'name_desc':
      return [{ user: { name: 'desc' } }, { id: 'desc' }];
    case 'startDate_asc':
      return [{ start_date: 'asc' }, { id: 'asc' }];
    case 'startDate_desc':
      return [{ start_date: 'desc' }, { id: 'desc' }];
    default:
      return [{ start_date: 'desc' }, { id: 'desc' }];
  }
}

@Injectable()
export class ParticipationsService {
  private readonly logger = new Logger(ParticipationsService.name);

  constructor(
    private prisma: PrismaService,
    private authz: AuthzService,
    private readonly businessMetrics: BusinessMetricsService,
  ) {}

  async create(
    createParticipationDto: CreateParticipationDto,
  ): Promise<ParticipationResponseDto> {
    // ── Resolver userId: existente ou criar novo ────────────────────────
    let userId: number;

    if (createParticipationDto.userId) {
      const user = await this.prisma.user.findUnique({
        where: { id: createParticipationDto.userId },
      });
      if (!user) {
        throw new BadRequestException(
          `Usuário com ID ${createParticipationDto.userId} não encontrado`,
        );
      }
      userId = user.id;
    } else if (
      createParticipationDto.newUserName &&
      createParticipationDto.newUserEmail &&
      createParticipationDto.newUserPassword
    ) {
      const existing = await this.prisma.user.findUnique({
        where: { email: createParticipationDto.newUserEmail },
      });
      if (existing) {
        throw new ConflictException(
          `E-mail ${createParticipationDto.newUserEmail} já está em uso`,
        );
      }
      const hashedPassword = await bcrypt.hash(
        createParticipationDto.newUserPassword,
        BCRYPT_ROUNDS,
      );
      const newUser = await this.prisma.user.create({
        data: {
          name: createParticipationDto.newUserName,
          email: createParticipationDto.newUserEmail,
          password: hashedPassword,
          active: true,
        },
      });
      userId = newUser.id;
    } else {
      throw new BadRequestException(
        'Informe userId ou os campos newUserName, newUserEmail e newUserPassword para criar um novo usuário.',
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

    const data: any = {
      user_id: userId,
      context_id: createParticipationDto.contextId,
      start_date: startDate,
      active: createParticipationDto.active ?? true,
    };
    if (endDate) data.end_date = endDate;

    // Criar participação e atribuir papel
    const participation = await this.prisma.$transaction(async (tx) => {
      const p = await tx.participation.create({ data });

      let roleId: number | undefined = createParticipationDto.roleId;

      if (roleId) {
        // Valida que o papel existe e é de escopo de contexto (nunca atribuir admin/superadmin via participação)
        const role = await tx.role.findUnique({ where: { id: roleId } });
        if (!role) {
          throw new BadRequestException(`Papel com ID ${roleId} não encontrado`);
        }
        if (role.scope === 'global') {
          throw new BadRequestException(
            'Papel de escopo global (ex.: Administrador) não pode ser atribuído por participação. Use a tela de Administradores.',
          );
        }
      } else {
        // Fallback: papel "participant" padrão
        const participantRole = await tx.role.findUnique({ where: { code: 'participant' } });
        roleId = participantRole?.id;
      }

      if (roleId) {
        await tx.participation_role.create({
          data: { participation_id: p.id, role_id: roleId },
        });
      }

      return p;
    });

    this.businessMetrics.recordParticipationCreated();
    return this.mapToResponseDto(participation);
  }

  async findAll(
    query: ParticipationQueryDto,
    userId: number,
  ): Promise<ListResponseDto<ParticipationResponseDto>> {
    const page = query.page || 1;
    const pageSize = query.pageSize || 20;
    const skip = (page - 1) * pageSize;

    const isAdmin = await this.authz.isAdmin(userId);
    let filterContextId: number;

    if (isAdmin) {
      // Admin: usa o contextId enviado pelo frontend (contexto atualmente selecionado)
      if (query.contextId == null) {
        throw new BadRequestException(
          'contextId é obrigatório. Selecione um contexto no cabeçalho da aplicação.',
        );
      }
      filterContextId = query.contextId;
    } else {
      filterContextId = await this.authz.resolveListContextId(
        userId,
        query.contextId,
        'GET /participations',
        { allowParticipantContext: true },
      );
    }

    // Construir filtros
    const where: any = { context_id: filterContextId };

    if (query.active !== undefined) {
      where.active = query.active;
    } else {
      // Por padrão, mostrar apenas participações ativas
      where.active = true;
    }

    if (isAdmin) {
      // Admin vê todas as participações do contexto; pode filtrar por userId se quiser
      if (query.userId !== undefined) {
        where.user_id = query.userId;
      }
    } else {
      // Participant só pode ver as próprias participações
      const managedIds = await this.authz.getManagedContextIds(userId);
      if (managedIds.length === 0) {
        where.user_id = userId;
      } else if (query.userId !== undefined) {
        where.user_id = query.userId;
      }
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
    const orderBy = participationListOrderBy(query.sort);

    // Buscar participações e total
    const [participations, totalItems] = await Promise.all([
      this.prisma.participation.findMany({
        where,
        skip,
        take: pageSize,
        orderBy,
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
    if (query.sort !== undefined) queryParams.sort = query.sort;

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

    if (updateParticipationDto.integrationTrainingMode !== undefined) {
      updateData.integration_training_mode =
        updateParticipationDto.integrationTrainingMode;
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

  async findRoles(participationId: number): Promise<RoleResponseDto[]> {
    const participation = await this.prisma.participation.findUnique({
      where: { id: participationId },
    });
    if (!participation) {
      throw new NotFoundException(
        `Participação com ID ${participationId} não encontrada`,
      );
    }

    const records = await this.prisma.participation_role.findMany({
      where: { participation_id: participationId },
      include: { role: true },
    });

    return records.map((pr) => ({
      id: pr.role.id,
      code: pr.role.code,
      name: pr.role.name,
      description: pr.role.description ?? null,
      scope: pr.role.scope ?? null,
      active: pr.role.active,
    }));
  }

  async addRole(
    participationId: number,
    roleId: number,
  ): Promise<RoleResponseDto[]> {
    const participation = await this.prisma.participation.findUnique({
      where: { id: participationId },
    });
    if (!participation) {
      throw new NotFoundException(
        `Participação com ID ${participationId} não encontrada`,
      );
    }

    const role = await this.prisma.role.findUnique({ where: { id: roleId } });
    if (!role) {
      throw new BadRequestException(`Papel com ID ${roleId} não encontrado`);
    }
    if (role.scope === 'global') {
      throw new BadRequestException(
        'Papel de escopo global (ex.: Administrador) não pode ser atribuído por participação.',
      );
    }

    const existing = await this.prisma.participation_role.findUnique({
      where: {
        participation_id_role_id: {
          participation_id: participationId,
          role_id: roleId,
        },
      },
    });
    if (existing) {
      throw new ConflictException(
        `A participação já possui o papel "${role.name}"`,
      );
    }

    await this.prisma.participation_role.create({
      data: { participation_id: participationId, role_id: roleId },
    });

    return this.findRoles(participationId);
  }

  async removeRole(
    participationId: number,
    roleId: number,
  ): Promise<RoleResponseDto[]> {
    const existing = await this.prisma.participation_role.findUnique({
      where: {
        participation_id_role_id: {
          participation_id: participationId,
          role_id: roleId,
        },
      },
    });
    if (!existing) {
      throw new NotFoundException(
        `A participação não possui o papel com ID ${roleId}`,
      );
    }

    await this.prisma.participation_role.delete({
      where: {
        participation_id_role_id: {
          participation_id: participationId,
          role_id: roleId,
        },
      },
    });

    return this.findRoles(participationId);
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
      integrationTrainingMode:
        participation.integration_training_mode ?? false,
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
