import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateTrackCycleDto } from './dto/create-track-cycle.dto';
import { UpdateTrackCycleDto } from './dto/update-track-cycle.dto';
import { UpdateTrackCycleStatusDto } from './dto/update-track-cycle-status.dto';
import { TrackCycleQueryDto } from './dto/track-cycle-query.dto';
import { track_cycle_status_enum } from '@prisma/client';

@Injectable()
export class TrackCyclesService {
  constructor(private prisma: PrismaService) {}

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
      throw new NotFoundException(`Trilha com ID ${createDto.trackId} não encontrada`);
    }

    const context = await this.prisma.context.findUnique({
      where: { id: createDto.contextId },
    });

    if (!context) {
      throw new NotFoundException(`Contexto com ID ${createDto.contextId} não encontrado`);
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

    return this.prisma.track_cycle.create({
      data: {
        track_id: createDto.trackId,
        context_id: createDto.contextId,
        name: createDto.name,
        description: createDto.description,
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

  async findAll(query: TrackCycleQueryDto) {
    const where: any = {};

    if (query.contextId) {
      where.context_id = query.contextId;
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

  async findOne(id: number) {
    const cycle = await this.prisma.track_cycle.findUnique({
      where: { id },
      include: {
        track: {
          include: {
            section: {
              include: {
                sequence: {
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

    return cycle;
  }

  async findActive(contextId?: number, trackId?: number) {
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

  async update(id: number, updateDto: UpdateTrackCycleDto) {
    const cycle = await this.prisma.track_cycle.findUnique({
      where: { id },
    });

    if (!cycle) {
      throw new NotFoundException(`Ciclo com ID ${id} não encontrado`);
    }

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

    const updateData: any = {};

    if (updateDto.name) updateData.name = updateDto.name;
    if (updateDto.description !== undefined)
      updateData.description = updateDto.description;
    if (updateDto.status) updateData.status = updateDto.status;
    if (updateDto.startDate) updateData.start_date = new Date(updateDto.startDate);
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

  async updateStatus(id: number, statusDto: UpdateTrackCycleStatusDto) {
    const cycle = await this.prisma.track_cycle.findUnique({
      where: { id },
    });

    if (!cycle) {
      throw new NotFoundException(`Ciclo com ID ${id} não encontrado`);
    }

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

  async remove(id: number) {
    const cycle = await this.prisma.track_cycle.findUnique({
      where: { id },
      include: {
        track_progress: true,
      },
    });

    if (!cycle) {
      throw new NotFoundException(`Ciclo com ID ${id} não encontrado`);
    }

    // Verificar se há progresso associado
    if (cycle.track_progress.length > 0) {
      throw new BadRequestException(
        `Não é possível deletar o ciclo pois existem ${cycle.track_progress.length} registros de progresso associados. Para prosseguir, primeiro remova ou migre os registros de progresso.`,
      );
    }

    // Hard delete - exclusão física do banco de dados
    return this.prisma.track_cycle.delete({
      where: { id },
    });
  }

  async getStudentsProgress(cycleId: number) {
    const cycle = await this.prisma.track_cycle.findUnique({
      where: { id: cycleId },
    });

    if (!cycle) {
      throw new NotFoundException(`Ciclo com ID ${cycleId} não encontrado`);
    }

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
