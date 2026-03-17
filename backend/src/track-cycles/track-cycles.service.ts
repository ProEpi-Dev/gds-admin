import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuthzService } from '../authz/authz.service';
import { CreateTrackCycleDto } from './dto/create-track-cycle.dto';
import { UpdateTrackCycleDto } from './dto/update-track-cycle.dto';
import { UpdateTrackCycleStatusDto } from './dto/update-track-cycle-status.dto';
import { TrackCycleQueryDto } from './dto/track-cycle-query.dto';
import { track_cycle_status_enum } from '@prisma/client';

@Injectable()
export class TrackCyclesService {
  constructor(
    private prisma: PrismaService,
    private authz: AuthzService,
  ) {}

  /**
   * Verifica se o usuário gerencia (manager ou content_manager) o contexto do ciclo.
   */
  private async assertCanManageCycle(userId: number, cycleContextId: number): Promise<void> {
    const isAdmin = await this.authz.isAdmin(userId);
    if (isAdmin) return;
    const canManage = await this.authz.hasAnyRole(userId, cycleContextId, ['manager', 'content_manager']);
    if (!canManage) {
      throw new ForbiddenException('Você não tem permissão para gerenciar este ciclo de trilha');
    }
  }

  /**
   * Verifica se o usuário tem acesso de leitura ao contexto do ciclo.
   * Aceita manager, content_manager e participant.
   */
  private async assertCanReadCycle(userId: number, cycleContextId: number): Promise<void> {
    const isAdmin = await this.authz.isAdmin(userId);
    if (isAdmin) return;
    const hasAccess = await this.authz.hasAnyRole(userId, cycleContextId, ['manager', 'content_manager', 'participant']);
    if (!hasAccess) {
      throw new ForbiddenException('Você não tem acesso a este ciclo de trilha');
    }
  }

  async create(createDto: CreateTrackCycleDto) {
    // Validar datas
    const startDate = new Date(createDto.startDate);
    const endDate = new Date(createDto.endDate);

    if (endDate < startDate) {
      throw new BadRequestException(
        'Data de término deve ser maior ou igual à data de início',
      );
    }

    // Verificar se track e context existem
    const track = await this.prisma.track.findUnique({
      where: { id: createDto.trackId },
    });

    if (!track) {
      throw new NotFoundException(
        `Trilha com ID ${createDto.trackId} não encontrada`,
      );
    }

    const context = await this.prisma.context.findUnique({
      where: { id: createDto.contextId },
    });

    if (!context) {
      throw new NotFoundException(
        `Contexto com ID ${createDto.contextId} não encontrado`,
      );
    }

    // Verificar se já existe ciclo com mesmo nome no track/context
    const existing = await this.prisma.track_cycle.findFirst({
      where: {
        track_id: createDto.trackId,
        context_id: createDto.contextId,
        name: createDto.name,
      },
    });

    if (existing) {
      throw new ConflictException(
        `Já existe um ciclo com o nome "${createDto.name}" para esta trilha neste contexto`,
      );
    }

    if (createDto.mandatorySlug) {
      const slugTaken = await this.prisma.track_cycle.findFirst({
        where: { mandatory_slug: createDto.mandatorySlug },
      });
      if (slugTaken) {
        throw new ConflictException(
          `Já existe um ciclo com o slug obrigatório "${createDto.mandatorySlug}" (ciclo ID: ${slugTaken.id}). O slug deve ser único em todo o sistema.`,
        );
      }
    }

    return this.prisma.track_cycle.create({
      data: {
        track_id: createDto.trackId,
        context_id: createDto.contextId,
        name: createDto.name,
        description: createDto.description,
        mandatory_slug: createDto.mandatorySlug ?? null,
        status: createDto.status || track_cycle_status_enum.draft,
        start_date: startDate,
        end_date: endDate,
      },
      include: {
        track: true,
        context: true,
      },
    });
  }

  async findAll(query: TrackCycleQueryDto, userId: number) {
    const isAdmin = await this.authz.isAdmin(userId);
    const where: any = {};

    if (isAdmin) {
      if (query.contextId) where.context_id = query.contextId;
    } else {
      let allowedContextIds = await this.authz.getManagedContextIds(userId);
      if (allowedContextIds.length === 0) {
        allowedContextIds = await this.authz.getParticipantContextIds(userId);
      }
      if (allowedContextIds.length === 0) return [];

      if (query.contextId) {
        if (!allowedContextIds.includes(query.contextId)) {
          throw new ForbiddenException('Você não tem acesso a este contexto');
        }
        where.context_id = query.contextId;
      } else {
        where.context_id = { in: allowedContextIds };
      }
    }

    if (query.trackId) {
      where.track_id = query.trackId;
    }

    if (query.status) {
      where.status = query.status;
    }

    if (query.active !== undefined) {
      where.active = query.active;
    }

    return this.prisma.track_cycle.findMany({
      where,
      include: {
        track: true,
        context: true,
      },
      orderBy: {
        start_date: 'desc',
      },
    });
  }

  async findOne(id: number, userId: number) {
    const cycle = await this.prisma.track_cycle.findUnique({
      where: { id },
      include: {
        track: {
          include: {
            section: {
              where: { active: true },
              orderBy: { order: 'asc' },
              include: {
                sequence: {
                  where: { active: true },
                  orderBy: { order: 'asc' },
                  include: {
                    content: true,
                    form: true,
                  },
                },
              },
            },
          },
        },
        context: true,
      },
    });

    if (!cycle) {
      throw new NotFoundException(`Ciclo com ID ${id} não encontrado`);
    }

    await this.assertCanReadCycle(userId, cycle.context_id);

    return cycle;
  }

  async findActive(contextId?: number, trackId?: number, userId?: number) {
    const where: any = {
      status: track_cycle_status_enum.active,
      active: true,
    };

    const today = new Date();
    where.start_date = { lte: today };
    where.end_date = { gte: today };

    if (contextId) {
      where.context_id = contextId;
    }

    if (trackId) {
      where.track_id = trackId;
    }

    return this.prisma.track_cycle.findMany({
      where,
      include: {
        track: true,
        context: true,
      },
      orderBy: {
        start_date: 'desc',
      },
    });
  }

  async update(id: number, updateDto: UpdateTrackCycleDto, userId: number) {
    const cycle = await this.prisma.track_cycle.findUnique({
      where: { id },
    });

    if (!cycle) {
      throw new NotFoundException(`Ciclo com ID ${id} não encontrado`);
    }

    await this.assertCanManageCycle(userId, cycle.context_id);

    // Validar datas se fornecidas
    if (updateDto.startDate || updateDto.endDate) {
      const startDate = updateDto.startDate
        ? new Date(updateDto.startDate)
        : cycle.start_date;
      const endDate = updateDto.endDate
        ? new Date(updateDto.endDate)
        : cycle.end_date;

      if (endDate < startDate) {
        throw new BadRequestException(
          'Data de término deve ser maior ou igual à data de início',
        );
      }
    }

    // Verificar conflito de nome se o nome foi alterado
    if (updateDto.name && updateDto.name !== cycle.name) {
      const existing = await this.prisma.track_cycle.findFirst({
        where: {
          track_id: cycle.track_id,
          context_id: cycle.context_id,
          name: updateDto.name,
          id: { not: id },
        },
      });

      if (existing) {
        throw new ConflictException(
          `Já existe um ciclo com o nome "${updateDto.name}" para esta trilha neste contexto`,
        );
      }
    }

    // Verificar conflito de mandatory_slug se alterado
    const newSlug =
      updateDto.mandatorySlug !== undefined
        ? updateDto.mandatorySlug === ''
          ? null
          : updateDto.mandatorySlug
        : undefined;
    if (newSlug !== undefined && newSlug != null) {
      const slugTaken = await this.prisma.track_cycle.findFirst({
        where: {
          mandatory_slug: newSlug,
          id: { not: id },
        },
      });
      if (slugTaken) {
        throw new ConflictException(
          `Já existe um ciclo com o slug obrigatório "${newSlug}" (ciclo ID: ${slugTaken.id}). O slug deve ser único em todo o sistema.`,
        );
      }
    }

    const updateData: any = {};

    if (updateDto.name) updateData.name = updateDto.name;
    if (updateDto.description !== undefined)
      updateData.description = updateDto.description;
    if (newSlug !== undefined) updateData.mandatory_slug = newSlug;
    if (updateDto.status) updateData.status = updateDto.status;
    if (updateDto.startDate)
      updateData.start_date = new Date(updateDto.startDate);
    if (updateDto.endDate) updateData.end_date = new Date(updateDto.endDate);

    updateData.updated_at = new Date();

    return this.prisma.track_cycle.update({
      where: { id },
      data: updateData,
      include: {
        track: true,
        context: true,
      },
    });
  }

  async updateStatus(id: number, statusDto: UpdateTrackCycleStatusDto, userId: number) {
    const cycle = await this.prisma.track_cycle.findUnique({
      where: { id },
    });

    if (!cycle) {
      throw new NotFoundException(`Ciclo com ID ${id} não encontrado`);
    }

    await this.assertCanManageCycle(userId, cycle.context_id);

    // Validar se pode mudar para 'active'
    if (statusDto.status === track_cycle_status_enum.active) {
      // Verificar se já existe outro ciclo ativo para a mesma trilha/contexto
      const activeCycle = await this.prisma.track_cycle.findFirst({
        where: {
          track_id: cycle.track_id,
          context_id: cycle.context_id,
          status: track_cycle_status_enum.active,
          id: { not: id },
          active: true,
        },
      });

      if (activeCycle) {
        throw new ConflictException(
          `Já existe um ciclo ativo (ID: ${activeCycle.id}) para esta trilha neste contexto. ` +
            `Desative o ciclo atual antes de ativar outro.`,
        );
      }
    }

    return this.prisma.track_cycle.update({
      where: { id },
      data: {
        status: statusDto.status,
        updated_at: new Date(),
      },
      include: {
        track: true,
        context: true,
      },
    });
  }

  async remove(id: number, userId: number) {
    const cycle = await this.prisma.track_cycle.findUnique({
      where: { id },
      include: {
        track_progress: true,
      },
    });

    if (!cycle) {
      throw new NotFoundException(`Ciclo com ID ${id} não encontrado`);
    }

    await this.assertCanManageCycle(userId, cycle.context_id);

    // Verificar se há progresso associado
    if (cycle.track_progress.length > 0) {
      throw new BadRequestException(
        `Não é possível deletar o ciclo pois existem ${cycle.track_progress.length} registros de progresso associados.`,
      );
    }

    // Hard delete - exclusão física do banco de dados
    return this.prisma.track_cycle.delete({
      where: { id },
    });
  }

  async getStudentsProgress(cycleId: number, userId: number) {
    const cycle = await this.prisma.track_cycle.findUnique({
      where: { id: cycleId },
    });

    if (!cycle) {
      throw new NotFoundException(`Ciclo com ID ${cycleId} não encontrado`);
    }

    await this.assertCanManageCycle(userId, cycle.context_id);

    const list = await this.prisma.track_progress.findMany({
      where: {
        track_cycle_id: cycleId,
      },
      include: {
        participation: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
          },
        },
      },
      orderBy: {
        progress_percentage: 'desc',
      },
    });
    return list.map((item) => ({
      ...item,
      progress_percentage: Number(item.progress_percentage ?? 0),
    }));
  }
}
