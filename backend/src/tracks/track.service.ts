import {
  Injectable,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateTrackDto } from './dto/create-track.dto';
import { progress_status_enum } from '@prisma/client';

@Injectable()
export class TrackService {
  constructor(private prisma: PrismaService) {}

  /**
   * Determina o context_id a ser usado para a trilha
   * Se não for fornecido, busca os contextos gerenciados pelo usuário
   */
  private async resolveContextId(
    contextId: number | undefined,
    userId: number,
  ): Promise<number> {
    if (contextId) {
      // Se foi fornecido, valida se o usuário gerencia esse contexto
      const isManager = await this.prisma.context_manager.findFirst({
        where: {
          user_id: userId,
          context_id: contextId,
          active: true,
        },
      });

      if (!isManager) {
        throw new BadRequestException(
          'Você não tem permissão para criar trilhas neste contexto',
        );
      }

      return contextId;
    }

    // Se não foi fornecido, busca os contextos gerenciados pelo usuário
    const managedContexts = await this.prisma.context_manager.findMany({
      where: {
        user_id: userId,
        active: true,
      },
      include: {
        context: {
          select: {
            id: true,
            name: true,
            active: true,
          },
        },
      },
    });

    const activeContexts = managedContexts.filter((mc) => mc.context.active);

    if (activeContexts.length === 0) {
      throw new BadRequestException(
        'Você não gerencia nenhum contexto. Entre em contato com um administrador.',
      );
    }

    if (activeContexts.length > 1) {
      const contextNames = activeContexts
        .map((mc) => mc.context.name)
        .join(', ');
      throw new BadRequestException(
        `Você gerencia múltiplos contextos (${contextNames}). Por favor, especifique o context_id no payload.`,
      );
    }

    return activeContexts[0].context_id;
  }

  async create(data: CreateTrackDto, user: any) {
    const { sections, context_id, ...trackData } = data;
    // Resolve o context_id
    const resolvedContextId = await this.resolveContextId(
      context_id,
      user.userId,
    );

    // Handle empty date strings
    if (trackData.start_date === '') trackData.start_date = undefined;
    if (trackData.end_date === '') trackData.end_date = undefined;

    return this.prisma.track.create({
      data: {
        ...trackData,
        context_id: resolvedContextId,
        section: sections
          ? {
              create: sections.map((section: any, index: number) => {
                const { sequences, ...sectionData } = section;
                return {
                  ...sectionData,
                  order: section.order ?? index,
                  sequence: sequences
                    ? {
                        create: sequences.map((seq: any, seqIndex: number) => ({
                          ...seq,
                          order: seq.order ?? seqIndex,
                        })),
                      }
                    : undefined,
                };
              }),
            }
          : undefined,
      },
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
    });
  }

  async list(query?: { contextId?: number }) {
    const where: any = { active: true };

    if (query?.contextId) {
      where.context_id = query.contextId;
    }

    return this.prisma.track.findMany({
      where,
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
    });
  }

  async get(id: number) {
    return this.prisma.track.findUnique({
      where: { id },
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
    });
  }

  async removeSequence(trackId: number, sectionId: number, sequenceId: number) {
    const sequence = await this.prisma.sequence.findUnique({
      where: { id: sequenceId },
    });

    if (!sequence || sequence.section_id !== sectionId) {
      throw new Error('Sequence not found');
    }

    // remove a sequence
    await this.prisma.sequence.delete({
      where: { id: sequenceId },
    });

    // reordenar as restantes
    const remainingSequences = await this.prisma.sequence.findMany({
      where: { section_id: sectionId },
      orderBy: { order: 'asc' },
    });

    for (let i = 0; i < remainingSequences.length; i++) {
      await this.prisma.sequence.update({
        where: { id: remainingSequences[i].id },
        data: { order: i },
      });
    }

    return this.get(trackId);
  }

  async update(id: number, data: CreateTrackDto, user: any) {
    const { sections, context_id, ...trackData } = data;

    // Verifica se a trilha existe
    const existingTrack = await this.prisma.track.findUnique({
      where: { id },
    });

    if (!existingTrack) {
      throw new NotFoundException('Trilha não encontrada');
    }

    // Se context_id foi fornecido e é diferente do atual, valida permissão
    if (context_id && context_id !== existingTrack.context_id) {
      await this.resolveContextId(context_id, user.id);
    }

    // Handle empty date strings
    if (trackData.start_date === '') trackData.start_date = undefined;
    if (trackData.end_date === '') trackData.end_date = undefined;

    // First update the track
    const updateData: any = { ...trackData };
    if (context_id !== undefined && context_id !== existingTrack.context_id) {
      updateData.context_id = context_id; // pode ser null
    }

    await this.prisma.track.update({
      where: { id },
      data: updateData,
    });

    // Handle sections if provided
    if (sections) {
      const existingSections = await this.prisma.section.findMany({
        where: { track_id: id },
        include: { sequence: true },
      });

      const existingSectionById = new Map(
        existingSections.map((section) => [section.id, section]),
      );

      const existingSequenceById = new Map(
        existingSections
          .flatMap((section) => section.sequence)
          .map((sequence) => [sequence.id, sequence]),
      );

      const processedSectionIds = new Set<number>();
      const processedSequenceIds = new Set<number>();

      for (const [index, section] of sections.entries()) {
        let sectionId = section.id;

        if (sectionId && existingSectionById.has(sectionId)) {
          await this.prisma.section.update({
            where: { id: sectionId },
            data: {
              name: section.name,
              order: section.order ?? index,
              active: true,
            },
          });
        } else {
          const createdSection = await this.prisma.section.create({
            data: {
              track_id: id,
              name: section.name,
              order: section.order ?? index,
              active: true,
            },
          });
          sectionId = createdSection.id;
        }

        processedSectionIds.add(sectionId!);

        const sectionSequences = section.sequences ?? [];
        for (const [seqIndex, seq] of sectionSequences.entries()) {
          if (seq.id && existingSequenceById.has(seq.id)) {
            await this.prisma.sequence.update({
              where: { id: seq.id },
              data: {
                section_id: sectionId,
                order: seq.order ?? seqIndex,
                content_id: seq.content_id ?? null,
                form_id: seq.form_id ?? null,
                active: true,
              },
            });
            processedSequenceIds.add(seq.id);
            continue;
          }

          const createdSequence = await this.prisma.sequence.create({
            data: {
              section_id: sectionId,
              order: seq.order ?? seqIndex,
              content_id: seq.content_id ?? null,
              form_id: seq.form_id ?? null,
              active: true,
            },
          });
          processedSequenceIds.add(createdSequence.id);
        }
      }

      const sectionIdsToDeactivate = existingSections
        .map((section) => section.id)
        .filter((sectionId) => !processedSectionIds.has(sectionId));

      if (sectionIdsToDeactivate.length > 0) {
        await this.prisma.section.updateMany({
          where: { id: { in: sectionIdsToDeactivate } },
          data: { active: false },
        });
      }

      const sequenceIdsToDeactivate = Array.from(
        existingSequenceById.keys(),
      ).filter((sequenceId) => !processedSequenceIds.has(sequenceId));

      if (sequenceIdsToDeactivate.length > 0) {
        await this.prisma.sequence.updateMany({
          where: { id: { in: sequenceIdsToDeactivate } },
          data: { active: false },
        });
      }

      await this.syncTrackProgressSequences(id);
    }

    return this.get(id);
  }

  private async syncTrackProgressSequences(trackId: number) {
    const activeSequences = await this.prisma.sequence.findMany({
      where: {
        active: true,
        section: {
          track_id: trackId,
          active: true,
        },
      },
      select: { id: true },
    });

    const activeSequenceIds = activeSequences.map((sequence) => sequence.id);

    const trackProgresses = await this.prisma.track_progress.findMany({
      where: {
        track_cycle: {
          track_id: trackId,
          active: true,
        },
      },
      select: {
        id: true,
        completed_at: true,
      },
    });

    if (!trackProgresses.length) {
      return;
    }

    const trackProgressIds = trackProgresses.map((progress) => progress.id);

    const completedCountByProgressId = new Map<number, number>();

    if (activeSequenceIds.length > 0) {
      const existingPairs = await this.prisma.sequence_progress.findMany({
        where: {
          track_progress_id: { in: trackProgressIds },
          sequence_id: { in: activeSequenceIds },
        },
        select: {
          track_progress_id: true,
          sequence_id: true,
        },
      });

      const pairSet = new Set(
        existingPairs.map(
          (pair) => `${pair.track_progress_id}:${pair.sequence_id}`,
        ),
      );

      const rowsToCreate: Array<{
        track_progress_id: number;
        sequence_id: number;
        status: progress_status_enum;
        visits_count: number;
      }> = [];

      for (const trackProgressId of trackProgressIds) {
        for (const sequenceId of activeSequenceIds) {
          const key = `${trackProgressId}:${sequenceId}`;
          if (!pairSet.has(key)) {
            rowsToCreate.push({
              track_progress_id: trackProgressId,
              sequence_id: sequenceId,
              status: progress_status_enum.not_started,
              visits_count: 0,
            });
          }
        }
      }

      if (rowsToCreate.length > 0) {
        await this.prisma.sequence_progress.createMany({
          data: rowsToCreate,
          skipDuplicates: true,
        });
      }

      const completedRows = await this.prisma.sequence_progress.findMany({
        where: {
          track_progress_id: { in: trackProgressIds },
          sequence_id: { in: activeSequenceIds },
          status: progress_status_enum.completed,
        },
        select: {
          track_progress_id: true,
        },
      });

      for (const row of completedRows) {
        completedCountByProgressId.set(
          row.track_progress_id,
          (completedCountByProgressId.get(row.track_progress_id) ?? 0) + 1,
        );
      }
    }

    for (const trackProgress of trackProgresses) {
      const totalSequences = activeSequenceIds.length;
      const completedSequences =
        completedCountByProgressId.get(trackProgress.id) ?? 0;

      const progressPercentage =
        totalSequences === 0
          ? 0
          : Math.round((completedSequences / totalSequences) * 10000) / 100;

      const status =
        progressPercentage === 100
          ? progress_status_enum.completed
          : progressPercentage > 0
            ? progress_status_enum.in_progress
            : progress_status_enum.not_started;

      await this.prisma.track_progress.update({
        where: { id: trackProgress.id },
        data: {
          progress_percentage: progressPercentage,
          status,
          completed_at:
            status === progress_status_enum.completed
              ? (trackProgress.completed_at ?? new Date())
              : null,
          updated_at: new Date(),
        },
      });
    }
  }

  async delete(id: number) {
    // Soft delete
    return this.prisma.track.update({
      where: { id },
      data: { active: false },
    });
  }

  async addContentToSection(
    trackId: number,
    sectionId: number,
    contentId: number,
  ) {
    // Get the current sequences in the section to determine the order
    const section = await this.prisma.section.findUnique({
      where: { id: sectionId },
      include: { sequence: true },
    });

    if (!section) {
      throw new Error('Section not found');
    }

    const maxOrder =
      section.sequence.length > 0
        ? Math.max(...section.sequence.map((seq) => seq.order))
        : -1;

    // Create new sequence
    await this.prisma.sequence.create({
      data: {
        section_id: sectionId,
        content_id: contentId,
        order: maxOrder + 1,
      },
    });

    return this.get(trackId);
  }

  async addFormToSection(trackId: number, sectionId: number, formId: number) {
    // Get the current sequences in the section to determine the order
    const section = await this.prisma.section.findUnique({
      where: { id: sectionId },
      include: { sequence: true },
    });

    if (!section) {
      throw new Error('Section not found');
    }

    const maxOrder =
      section.sequence.length > 0
        ? Math.max(...section.sequence.map((seq) => seq.order))
        : -1;

    // Create new sequence
    await this.prisma.sequence.create({
      data: {
        section_id: sectionId,
        form_id: formId,
        order: maxOrder + 1,
      },
    });

    return this.get(trackId);
  }

  async removeContentFromSection(
    trackId: number,
    sectionId: number,
    contentId: number,
  ) {
    // Find the sequence that contains this content in this section
    const sequence = await this.prisma.sequence.findFirst({
      where: {
        section_id: sectionId,
        content_id: contentId,
      },
    });

    if (!sequence) {
      throw new Error('Sequence not found');
    }

    // Delete the sequence
    await this.prisma.sequence.delete({
      where: { id: sequence.id },
    });

    // Reorder remaining sequences in the section
    const remainingSequences = await this.prisma.sequence.findMany({
      where: { section_id: sectionId },
      orderBy: { order: 'asc' },
    });

    // Update orders to be sequential starting from 0
    for (let i = 0; i < remainingSequences.length; i++) {
      await this.prisma.sequence.update({
        where: { id: remainingSequences[i].id },
        data: { order: i },
      });
    }

    return this.get(trackId);
  }

  async reorderSections(
    trackId: number,
    sections: Array<{ id: number; order: number }>,
  ) {
    // Update order for each section
    for (const section of sections) {
      await this.prisma.section.update({
        where: { id: section.id },
        data: { order: section.order },
      });
    }

    return this.get(trackId);
  }

  async reorderSequences(
    trackId: number,
    sectionId: number,
    sequences: Array<{ id: number; order: number }>,
  ) {
    // Update order for each sequence
    for (const sequence of sequences) {
      await this.prisma.sequence.update({
        where: { id: sequence.id },
        data: { order: sequence.order },
      });
    }

    return this.get(trackId);
  }
}
