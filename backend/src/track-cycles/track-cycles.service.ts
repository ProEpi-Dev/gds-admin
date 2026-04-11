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
import { ReplaceTrackCycleSchedulesDto } from './dto/replace-track-cycle-schedules.dto';
import { track_cycle_status_enum } from '@prisma/client';
import {
  assertValidWindow,
  resolveSectionEffectiveWindow,
  resolveSequenceEffectiveWindow,
  toDateOnlyUtc,
} from './track-cycle-schedule.util';

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
        track_cycle_section_schedule: true,
        track_cycle_sequence_schedule: true,
      },
    });

    if (!cycle) {
      throw new NotFoundException(`Ciclo com ID ${id} não encontrado`);
    }

    await this.assertCanReadCycle(userId, cycle.context_id);

    return cycle;
  }

  /**
   * Substitui todos os agendamentos opcionais de seção/sequência do ciclo (idempotente).
   */
  async replaceSchedules(
    cycleId: number,
    dto: ReplaceTrackCycleSchedulesDto,
    userId: number,
  ) {
    const cycle = await this.prisma.track_cycle.findUnique({
      where: { id: cycleId },
    });

    if (!cycle) {
      throw new NotFoundException(`Ciclo com ID ${cycleId} não encontrado`);
    }

    await this.assertCanManageCycle(userId, cycle.context_id);

    const sequenceById = await this.loadAndAssertScheduleTargets(dto, cycle.track_id);

    const sectionCreates = this.buildSectionScheduleCreates(dto, cycle, cycleId);
    const sectionScheduleBySectionId = new Map(
      sectionCreates.map((r) => [r.section_id, r]),
    );
    const sequenceCreates = this.buildSequenceScheduleCreates(
      dto,
      cycle,
      cycleId,
      sectionScheduleBySectionId,
      sequenceById,
    );

    await this.persistScheduleReplacement(cycleId, sectionCreates, sequenceCreates);

    return this.findOne(cycleId, userId);
  }

  private parseScheduleDay(v: string | null | undefined): Date | null {
    if (v === undefined || v === null || v === '') return null;
    return new Date(`${v}T00:00:00.000Z`);
  }

  private async loadAndAssertScheduleTargets(
    dto: ReplaceTrackCycleSchedulesDto,
    trackId: number,
  ) {
    const sectionIds = dto.sectionSchedules.map((s) => s.sectionId);
    if (new Set(sectionIds).size !== sectionIds.length) {
      throw new BadRequestException('sectionId duplicado em sectionSchedules');
    }
    const sequenceIds = dto.sequenceSchedules.map((s) => s.sequenceId);
    if (new Set(sequenceIds).size !== sequenceIds.length) {
      throw new BadRequestException('sequenceId duplicado em sequenceSchedules');
    }

    const sections = await this.prisma.section.findMany({
      where: { id: { in: sectionIds.length ? sectionIds : [-1] } },
    });
    const sectionById = new Map(sections.map((s) => [s.id, s]));
    for (const sid of sectionIds) {
      if (sectionById.get(sid)?.track_id !== trackId) {
        throw new BadRequestException(
          `Seção ${sid} não pertence à trilha deste ciclo`,
        );
      }
    }

    const sequences = await this.prisma.sequence.findMany({
      where: { id: { in: sequenceIds.length ? sequenceIds : [-1] } },
      include: { section: true },
    });
    const sequenceById = new Map(sequences.map((q) => [q.id, q]));
    for (const qid of sequenceIds) {
      if (sequenceById.get(qid)?.section.track_id !== trackId) {
        throw new BadRequestException(
          `Sequência ${qid} não pertence à trilha deste ciclo`,
        );
      }
    }

    return sequenceById;
  }

  private buildSectionScheduleCreates(
    dto: ReplaceTrackCycleSchedulesDto,
    cycle: { start_date: Date; end_date: Date },
    cycleId: number,
  ) {
    const rows: Array<{
      track_cycle_id: number;
      section_id: number;
      start_date: Date | null;
      end_date: Date | null;
    }> = [];

    for (const item of dto.sectionSchedules) {
      const startD = this.parseScheduleDay(item.startDate ?? null);
      const endD = this.parseScheduleDay(item.endDate ?? null);
      if (startD && endD && toDateOnlyUtc(startD) > toDateOnlyUtc(endD)) {
        throw new BadRequestException(
          `Seção ${item.sectionId}: data de início deve ser anterior ou igual ao término`,
        );
      }
      if (startD == null && endD == null) {
        continue;
      }
      const win = resolveSectionEffectiveWindow(cycle.start_date, cycle.end_date, {
        start_date: startD,
        end_date: endD,
      });
      try {
        assertValidWindow(win.start, win.end);
      } catch {
        throw new BadRequestException(
          `Seção ${item.sectionId}: janela efetiva inválida em relação ao ciclo`,
        );
      }
      rows.push({
        track_cycle_id: cycleId,
        section_id: item.sectionId,
        start_date: startD,
        end_date: endD,
      });
    }

    return rows;
  }

  private buildSequenceScheduleCreates(
    dto: ReplaceTrackCycleSchedulesDto,
    cycle: { start_date: Date; end_date: Date },
    cycleId: number,
    sectionScheduleBySectionId: Map<
      number,
      { start_date: Date | null; end_date: Date | null }
    >,
    sequenceById: Map<
      number,
      { section_id: number; section: { track_id: number } }
    >,
  ) {
    const rows: Array<{
      track_cycle_id: number;
      sequence_id: number;
      start_date: Date | null;
      end_date: Date | null;
    }> = [];

    for (const item of dto.sequenceSchedules) {
      const startD = this.parseScheduleDay(item.startDate ?? null);
      const endD = this.parseScheduleDay(item.endDate ?? null);
      if (startD && endD && toDateOnlyUtc(startD) > toDateOnlyUtc(endD)) {
        throw new BadRequestException(
          `Sequência ${item.sequenceId}: data de início deve ser anterior ou igual ao término`,
        );
      }
      if (startD == null && endD == null) {
        continue;
      }
      const seq = sequenceById.get(item.sequenceId);
      if (seq === undefined) {
        throw new BadRequestException(`Sequência ${item.sequenceId} não encontrada`);
      }
      const secOvRow = sectionScheduleBySectionId.get(seq.section_id);
      const secOverride = secOvRow
        ? { start_date: secOvRow.start_date, end_date: secOvRow.end_date }
        : null;
      const sectionWin = resolveSectionEffectiveWindow(
        cycle.start_date,
        cycle.end_date,
        secOverride,
      );
      try {
        assertValidWindow(sectionWin.start, sectionWin.end);
      } catch {
        throw new BadRequestException(
          `Sequência ${item.sequenceId}: janela da seção inválida`,
        );
      }
      const seqWin = resolveSequenceEffectiveWindow(sectionWin, {
        start_date: startD,
        end_date: endD,
      });
      try {
        assertValidWindow(seqWin.start, seqWin.end);
      } catch {
        const secFrom = sectionWin.start.toISOString().split('T')[0];
        const secTo = sectionWin.end.toISOString().split('T')[0];
        throw new BadRequestException(
          `Sequência ${item.sequenceId}: as datas deste item, após encaixar na janela da seção (${secFrom} a ${secTo}), não formam um período válido (início deve ser ≤ fim). ` +
            'Ajuste início/término do item para ficarem totalmente dentro desse intervalo (ex.: término do item não pode passar do fim da seção; datas antes do início da seção são “puxadas” para o início da seção e podem conflitar com o término).',
        );
      }
      rows.push({
        track_cycle_id: cycleId,
        sequence_id: item.sequenceId,
        start_date: startD,
        end_date: endD,
      });
    }

    return rows;
  }

  private async persistScheduleReplacement(
    cycleId: number,
    sectionCreates: Array<{
      track_cycle_id: number;
      section_id: number;
      start_date: Date | null;
      end_date: Date | null;
    }>,
    sequenceCreates: Array<{
      track_cycle_id: number;
      sequence_id: number;
      start_date: Date | null;
      end_date: Date | null;
    }>,
  ) {
    await this.prisma.$transaction(async (tx) => {
      await tx.track_cycle_section_schedule.deleteMany({
        where: { track_cycle_id: cycleId },
      });
      await tx.track_cycle_sequence_schedule.deleteMany({
        where: { track_cycle_id: cycleId },
      });
      if (sectionCreates.length > 0) {
        await tx.track_cycle_section_schedule.createMany({ data: sectionCreates });
      }
      if (sequenceCreates.length > 0) {
        await tx.track_cycle_sequence_schedule.createMany({
          data: sequenceCreates,
        });
      }
    });
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
