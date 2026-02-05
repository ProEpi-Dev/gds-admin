import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { StartTrackProgressDto } from './dto/start-track-progress.dto';
import { UpdateSequenceProgressDto } from './dto/update-sequence-progress.dto';
import { TrackProgressQueryDto } from './dto/track-progress-query.dto';
import { TrackExecutionsQueryDto } from './dto/track-executions-query.dto';
import { progress_status_enum, track_cycle_status_enum } from '@prisma/client';

@Injectable()
export class TrackProgressService {
  constructor(private prisma: PrismaService) {}

  /**
   * Converte progress_percentage (Decimal do Prisma) para number na serialização JSON
   */
  private serializeProgressPercentage<T>(item: T): T {
    if (item == null) return item;
    const anyItem = item as any;
    return {
      ...anyItem,
      progress_percentage: Number(anyItem.progress_percentage ?? 0),
    } as T;
  }

  private serializeProgressList<T>(items: T[]): T[] {
    return items.map((item) => this.serializeProgressPercentage(item));
  }

  /**
   * Inicia o progresso de um usuário em um ciclo de trilha
   */
  async startTrackProgress(dto: StartTrackProgressDto) {
    // Verificar se participação existe
    const participation = await this.prisma.participation.findUnique({
      where: { id: dto.participationId },
      include: { user: true, context: true },
    });

    if (!participation) {
      throw new NotFoundException(
        `Participação com ID ${dto.participationId} não encontrada`,
      );
    }

    // Verificar se ciclo existe e está ativo
    const cycle = await this.prisma.track_cycle.findUnique({
      where: { id: dto.trackCycleId },
      include: {
        track: {
          include: {
            section: {
              where: { active: true },
              include: {
                sequence: {
                  where: { active: true },
                  orderBy: { order: 'asc' },
                },
              },
              orderBy: { order: 'asc' },
            },
          },
        },
      },
    });

    if (!cycle) {
      throw new NotFoundException(
        `Ciclo com ID ${dto.trackCycleId} não encontrado`,
      );
    }

    // Verificar se participação pertence ao mesmo contexto do ciclo
    if (participation.context_id !== cycle.context_id) {
      throw new BadRequestException(
        'A participação não pertence ao contexto do ciclo',
      );
    }

    // Verificar se já existe progresso para esta participação/ciclo
    const existing = await this.prisma.track_progress.findUnique({
      where: {
        participation_id_track_cycle_id: {
          participation_id: dto.participationId,
          track_cycle_id: dto.trackCycleId,
        },
      },
    });

    if (existing) {
      throw new ConflictException(
        'Já existe um progresso registrado para este usuário neste ciclo',
      );
    }

    // Criar track_progress
    const trackProgress = await this.prisma.track_progress.create({
      data: {
        participation_id: dto.participationId,
        track_cycle_id: dto.trackCycleId,
        status: progress_status_enum.in_progress,
        progress_percentage: 0,
        started_at: new Date(),
      },
      include: {
        participation: {
          include: {
            user: {
              select: { id: true, name: true, email: true },
            },
          },
        },
        track_cycle: {
          include: {
            track: true,
          },
        },
      },
    });

    // Criar sequence_progress para todas as sequências da trilha
    const sequences = cycle.track.section.flatMap(
      (section) => section.sequence,
    );

    if (sequences.length > 0) {
      await this.prisma.sequence_progress.createMany({
        data: sequences.map((seq) => ({
          track_progress_id: trackProgress.id,
          sequence_id: seq.id,
          status: progress_status_enum.not_started,
          visits_count: 0,
        })),
      });
    }

    return this.serializeProgressPercentage(trackProgress);
  }

  /**
   * Busca ou cria progresso de sequência
   */
  async getOrCreateSequenceProgress(
    trackProgressId: number,
    sequenceId: number,
  ) {
    let sequenceProgress = await this.prisma.sequence_progress.findUnique({
      where: {
        track_progress_id_sequence_id: {
          track_progress_id: trackProgressId,
          sequence_id: sequenceId,
        },
      },
    });

    if (!sequenceProgress) {
      sequenceProgress = await this.prisma.sequence_progress.create({
        data: {
          track_progress_id: trackProgressId,
          sequence_id: sequenceId,
          status: progress_status_enum.not_started,
          visits_count: 0,
        },
      });
    }

    return sequenceProgress;
  }

  /**
   * Atualiza o progresso de uma sequência
   */
  async updateSequenceProgress(
    trackProgressId: number,
    sequenceId: number,
    dto: UpdateSequenceProgressDto,
  ) {
    const trackProgress = await this.prisma.track_progress.findUnique({
      where: { id: trackProgressId },
      include: {
        sequence_progress: true,
        track_cycle: {
          include: {
            track: {
              include: {
                section: {
                  where: { active: true },
                  include: {
                    sequence: {
                      where: { active: true },
                    },
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!trackProgress) {
      throw new NotFoundException(
        `Progresso de trilha com ID ${trackProgressId} não encontrado`,
      );
    }

    const sequence = await this.prisma.sequence.findUnique({
      where: { id: sequenceId },
    });

    if (!sequence) {
      throw new NotFoundException(
        `Sequência com ID ${sequenceId} não encontrada`,
      );
    }

    if (!sequence.active) {
      throw new BadRequestException(
        `Sequência com ID ${sequenceId} está inativa`,
      );
    }

    // Buscar ou criar sequenceProgress
    let sequenceProgress = await this.getOrCreateSequenceProgress(
      trackProgressId,
      sequenceId,
    );

    // Atualizar sequenceProgress com dados do dto
    sequenceProgress = await this.prisma.sequence_progress.update({
      where: { id: sequenceProgress.id },
      data: {
        ...dto,
        visits_count:
          typeof dto.visits_count === 'number'
            ? dto.visits_count
            : sequenceProgress.visits_count,
        updated_at: new Date(),
      },
    });

    // Recalcular e atualizar progresso total da track_progress
    await this.recalculateTrackProgress(trackProgressId);

    return sequenceProgress;
  }

  /**
   * Recalcula o percentual de progresso da trilha
   */
  async recalculateTrackProgress(trackProgressId: number) {
    const trackProgress = await this.prisma.track_progress.findUnique({
      where: { id: trackProgressId },
      include: {
        sequence_progress: true,
        track_cycle: {
          include: {
            track: {
              include: {
                section: {
                  where: { active: true },
                  include: {
                    sequence: {
                      where: { active: true },
                    },
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!trackProgress) {
      throw new NotFoundException(
        `Progresso de trilha com ID ${trackProgressId} não encontrado`,
      );
    }

    // Contar total de sequências ativas
    const totalSequences = trackProgress.track_cycle.track.section
      .flatMap((section) => section.sequence)
      .filter((seq) => seq.active).length;

    if (totalSequences === 0) {
      return this.serializeProgressPercentage(trackProgress);
    }

    // Contar sequências completadas
    const completedSequences = trackProgress.sequence_progress.filter(
      (sp) => sp.status === progress_status_enum.completed,
    ).length;

    // Calcular percentual
    const percentage = (completedSequences / totalSequences) * 100;

    // Determinar status
    let status = trackProgress.status;
    let completedAt = trackProgress.completed_at;

    if (percentage === 100) {
      status = progress_status_enum.completed;
      completedAt = completedAt || new Date();
    } else if (percentage > 0) {
      status = progress_status_enum.in_progress;
    }

    // Atualizar track_progress
    const updated = await this.prisma.track_progress.update({
      where: { id: trackProgressId },
      data: {
        progress_percentage: Math.round(percentage * 100) / 100, // 2 casas decimais
        status,
        completed_at: completedAt,
        updated_at: new Date(),
      },
    });
    return this.serializeProgressPercentage(updated);
  }

  /**
   * Verifica se o usuário pode acessar uma sequência (bloqueio sequencial)
   */
  async canAccessSequence(
    participationId: number,
    trackCycleId: number,
    sequenceId: number,
  ): Promise<{ canAccess: boolean; reason?: string }> {
    // Buscar progresso da trilha
    const trackProgress = await this.prisma.track_progress.findUnique({
      where: {
        participation_id_track_cycle_id: {
          participation_id: participationId,
          track_cycle_id: trackCycleId,
        },
      },
    });

    if (!trackProgress) {
      return {
        canAccess: false,
        reason: 'Você ainda não iniciou esta trilha',
      };
    }

    // Buscar a sequência e sua ordem
    const sequence = await this.prisma.sequence.findUnique({
      where: { id: sequenceId },
      include: {
        section: {
          include: {
            track: true,
          },
        },
      },
    });

    if (!sequence) {
      return {
        canAccess: false,
        reason: 'Sequência não encontrada',
      };
    }

    // Buscar sequência anterior (mesma seção, ordem anterior)
    const previousSequence = await this.prisma.sequence.findFirst({
      where: {
        section_id: sequence.section_id,
        order: { lt: sequence.order },
        active: true,
      },
      orderBy: {
        order: 'desc',
      },
    });

    // Se não há sequência anterior, pode acessar
    if (!previousSequence) {
      return { canAccess: true };
    }

    // Verificar se completou a sequência anterior
    const previousProgress = await this.prisma.sequence_progress.findUnique({
      where: {
        track_progress_id_sequence_id: {
          track_progress_id: trackProgress.id,
          sequence_id: previousSequence.id,
        },
      },
    });

    if (
      !previousProgress ||
      previousProgress.status !== progress_status_enum.completed
    ) {
      return {
        canAccess: false,
        reason: 'Você precisa completar a atividade anterior primeiro',
      };
    }

    return { canAccess: true };
  }

  /**
   * Busca progresso de um usuário em um ciclo específico.
   * Inclui sequence_locked: mapa sequenceId -> boolean (locked = precisa concluir anterior).
   */
  async findByUserAndCycle(participationId: number, trackCycleId: number) {
    const trackProgress = await this.prisma.track_progress.findUnique({
      where: {
        participation_id_track_cycle_id: {
          participation_id: participationId,
          track_cycle_id: trackCycleId,
        },
      },
      include: {
        track_cycle: {
          include: {
            track: {
              include: {
                section: {
                  where: { active: true },
                  include: {
                    sequence: {
                      where: { active: true },
                      orderBy: { order: 'asc' },
                    },
                  },
                  orderBy: { order: 'asc' },
                },
              },
            },
          },
        },
        sequence_progress: {
          include: {
            sequence: true,
          },
        },
        participation: {
          include: {
            user: {
              select: { id: true, name: true, email: true },
            },
          },
        },
      },
    });

    const serialized = this.serializeProgressPercentage(trackProgress) as any;
    if (!serialized) return serialized;

    const sequence_locked = this.computeSequenceLocked(serialized);
    return { ...serialized, sequence_locked };
  }

  /**
   * Calcula para cada sequência se está bloqueada (locked) com base na ordem e no progresso.
   * locked = true quando alguma sequência anterior (na ordem da trilha) não está concluída.
   */
  private computeSequenceLocked(trackProgress: any): Record<number, boolean> {
    const result: Record<number, boolean> = {};
    const sections = trackProgress?.track_cycle?.track?.section;
    if (!Array.isArray(sections)) return result;

    const statusBySequenceId = new Map<number, string>();
    (trackProgress.sequence_progress ?? []).forEach((sp: any) => {
      statusBySequenceId.set(sp.sequence_id, sp.status ?? 'not_started');
    });

    const orderedSections = [...sections].sort(
      (a: any, b: any) => (a.order ?? 0) - (b.order ?? 0),
    );
    const orderedSequenceIds: number[] = [];
    orderedSections.forEach((sec: any) => {
      const seqs = Array.isArray(sec.sequence) ? [...sec.sequence] : [];
      seqs.sort((a: any, b: any) => (a.order ?? 0) - (b.order ?? 0));
      seqs.forEach((seq: any) => orderedSequenceIds.push(seq.id));
    });

    orderedSequenceIds.forEach((sequenceId, index) => {
      let locked = false;
      for (let i = 0; i < index; i++) {
        const prevStatus = statusBySequenceId.get(orderedSequenceIds[i]);
        if (prevStatus !== progress_status_enum.completed) {
          locked = true;
          break;
        }
      }
      result[sequenceId] = locked;
    });

    return result;
  }

  /**
   * Lista progressos com filtros
   */
  async findAll(query: TrackProgressQueryDto) {
    const where: any = {};

    if (query.participationId) {
      where.participation_id = query.participationId;
    }

    if (query.trackCycleId) {
      where.track_cycle_id = query.trackCycleId;
    }

    if (query.status) {
      where.status = query.status;
    }

    // Se forneceu userId, buscar participações do usuário
    if (query.userId) {
      where.participation = {
        user_id: query.userId,
      };
    }

    const list = await this.prisma.track_progress.findMany({
      where,
      include: {
        track_cycle: {
          include: {
            track: true,
            context: true,
          },
        },
        participation: {
          include: {
            user: {
              select: { id: true, name: true, email: true },
            },
          },
        },
      },
      orderBy: {
        updated_at: 'desc',
      },
    });
    return this.serializeProgressList(list);
  }

  /**
   * Busca histórico de ciclos completados por um usuário
   */
  async findCompletedByUser(userId: number) {
    const list = await this.prisma.track_progress.findMany({
      where: {
        participation: {
          user_id: userId,
        },
        status: progress_status_enum.completed,
      },
      include: {
        track_cycle: {
          include: {
            track: true,
            context: true,
          },
        },
      },
      orderBy: {
        completed_at: 'desc',
      },
    });
    return this.serializeProgressList(list);
  }

  /**
   * Marca sequência de conteúdo como completada (auto-complete ao visualizar)
   */
  async completeContentSequence(trackProgressId: number, sequenceId: number) {
    // Verificar se é realmente um conteúdo (não quiz)
    const sequence = await this.prisma.sequence.findUnique({
      where: { id: sequenceId },
    });

    if (!sequence) {
      throw new NotFoundException('Sequência não encontrada');
    }

    if (sequence.form_id) {
      throw new BadRequestException(
        'Esta sequência é um quiz e deve ser completada através de submissão',
      );
    }

    // Atualizar para completado
    return this.updateSequenceProgress(trackProgressId, sequenceId, {
      status: progress_status_enum.completed,
    });
  }

  /**
   * Marca sequência de quiz como completada (chamado quando quiz é aprovado)
   */
  async completeQuizSequence(
    trackProgressId: number,
    sequenceId: number,
    quizSubmissionId: number,
  ) {
    // Verificar se é realmente um quiz
    const sequence = await this.prisma.sequence.findUnique({
      where: { id: sequenceId },
    });

    if (!sequence) {
      throw new NotFoundException('Sequência não encontrada');
    }

    if (!sequence.form_id) {
      throw new BadRequestException('Esta sequência não é um quiz');
    }

    // Buscar ou criar sequence_progress
    const sequenceProgress = await this.getOrCreateSequenceProgress(
      trackProgressId,
      sequenceId,
    );

    // Vincular quiz_submission ao sequence_progress
    await this.prisma.quiz_submission.update({
      where: { id: quizSubmissionId },
      data: {
        sequence_progress_id: sequenceProgress.id,
      },
    });

    // Marcar como completado
    return this.updateSequenceProgress(trackProgressId, sequenceId, {
      status: progress_status_enum.completed,
    });
  }

  /**
   * Conformidade de trilhas obrigatórias para uma participação.
   * Lista os slugs obrigatórios do contexto e indica se o usuário já completou algum ciclo com cada slug.
   */
  async getMandatoryCompliance(participationId: number, userId: number) {
    const participation = await this.prisma.participation.findUnique({
      where: { id: participationId },
      include: { context: true },
    });

    if (!participation) {
      throw new NotFoundException(
        `Participação com ID ${participationId} não encontrada`,
      );
    }

    if (participation.user_id !== userId) {
      throw new ForbiddenException(
        'Só é possível consultar conformidade da própria participação',
      );
    }

    const today = new Date();
    const mandatoryCycles = await this.prisma.track_cycle.findMany({
      where: {
        context_id: participation.context_id,
        status: track_cycle_status_enum.active,
        active: true,
        mandatory_slug: { not: null },
        start_date: { lte: today },
        end_date: { gte: today },
      },
      include: { track: true },
      orderBy: { start_date: 'desc' },
    });

    const completedBySlug = new Map<string, boolean>();
    const trackCycleIdBySlug = new Map<string, number>();
    const labelBySlug = new Map<string, string>();

    for (const cycle of mandatoryCycles) {
      const slug = cycle.mandatory_slug!;
      if (trackCycleIdBySlug.has(slug)) continue; // já temos um ciclo para este slug (pegamos o primeiro por ordem)
      trackCycleIdBySlug.set(slug, cycle.id);
      labelBySlug.set(
        slug,
        `${cycle.track?.name ?? 'Trilha'} – ${cycle.name}`.trim(),
      );
    }

    const slugs = Array.from(trackCycleIdBySlug.keys());
    if (slugs.length === 0) {
      return {
        items: [],
        totalRequired: 0,
        completedCount: 0,
      };
    }

    const completedProgress = await this.prisma.track_progress.findMany({
      where: {
        participation_id: participationId,
        status: progress_status_enum.completed,
        track_cycle: {
          mandatory_slug: { in: slugs },
          context_id: participation.context_id,
        },
      },
      select: { track_cycle: { select: { mandatory_slug: true } } },
    });

    for (const p of completedProgress) {
      const s = p.track_cycle?.mandatory_slug;
      if (s) completedBySlug.set(s, true);
    }

    const items = slugs.map((mandatorySlug) => ({
      mandatorySlug,
      label: labelBySlug.get(mandatorySlug) ?? mandatorySlug,
      completed: completedBySlug.get(mandatorySlug) ?? false,
      trackCycleId: trackCycleIdBySlug.get(mandatorySlug),
    }));

    const completedCount = items.filter((i) => i.completed).length;

    return {
      items,
      totalRequired: items.length,
      completedCount,
    };
  }

  /**
   * Lista execuções (conclusões de sequências) para visão geral com filtros
   */
  async findExecutions(query: TrackExecutionsQueryDto) {
    const andConditions: any[] = [{ completed_at: { not: null } }];

    const trackProgressWhere: any = {};
    if (query.trackCycleId != null)
      trackProgressWhere.track_cycle_id = query.trackCycleId;
    if (query.participationId != null)
      trackProgressWhere.participation_id = query.participationId;
    if (Object.keys(trackProgressWhere).length > 0) {
      andConditions.push({ track_progress: trackProgressWhere });
    }
    if (query.sequenceType === 'content') {
      andConditions.push({ sequence: { form_id: null } });
    } else if (query.sequenceType === 'quiz') {
      andConditions.push({ sequence: { form_id: { not: null } } });
    }
    if (query.activityName?.trim()) {
      const term = query.activityName.trim();
      andConditions.push({
        OR: [
          {
            sequence: {
              content: { title: { contains: term, mode: 'insensitive' } },
            },
          },
          {
            sequence: {
              form: { title: { contains: term, mode: 'insensitive' } },
            },
          },
        ],
      });
    }
    if (query.dateFrom) {
      andConditions.push({
        completed_at: { gte: new Date(query.dateFrom) },
      });
    }
    if (query.dateTo) {
      const end = new Date(query.dateTo);
      end.setHours(23, 59, 59, 999);
      andConditions.push({ completed_at: { lte: end } });
    }

    const rows = await this.prisma.sequence_progress.findMany({
      where: { AND: andConditions },
      include: {
        track_progress: {
          include: {
            participation: { include: { user: true } },
            track_cycle: true,
          },
        },
        sequence: {
          include: {
            content: true,
            form: true,
          },
        },
      },
      orderBy: { completed_at: 'desc' },
    });

    return rows.map((sp) => {
      const tp = sp.track_progress;
      const seq = sp.sequence;
      const activityName = seq.form_id
        ? (seq.form?.title ?? `Quiz #${seq.form_id}`)
        : (seq.content?.title ?? `Conteúdo #${seq.content_id}`);
      const participantName = tp.participation?.user
        ? `${tp.participation.user.name}`
        : `Participação #${tp.participation_id}`;
      return {
        id: sp.id,
        trackCycleId: tp.track_cycle_id,
        trackCycleName: tp.track_cycle?.name ?? '',
        activityName,
        sequenceType: seq.form_id ? ('quiz' as const) : ('content' as const),
        participationId: tp.participation_id,
        participantName,
        completedAt: sp.completed_at,
      };
    });
  }
}
