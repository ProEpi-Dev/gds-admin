import {
  Injectable,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateTrackDto } from './dto/create-track.dto';

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
    const resolvedContextId = await this.resolveContextId(context_id, user.id);

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

  async get(id: number) {
    return this.prisma.track.findUnique({
      where: { id },
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
    if (context_id && context_id !== existingTrack.context_id) {
      updateData.context_id = context_id;
    }

    await this.prisma.track.update({
      where: { id },
      data: updateData,
    });

    // Handle sections if provided
    if (sections) {
      // Delete existing sections and sequences
      await this.prisma.sequence.deleteMany({
        where: { section: { track_id: id } },
      });
      await this.prisma.section.deleteMany({
        where: { track_id: id },
      });

      // Create new sections and sequences
      for (const [index, section] of sections.entries()) {
        const { sequences, ...sectionData } = section;
        await this.prisma.section.create({
          data: {
            track_id: id,
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
          },
        });
      }
    }

    return this.get(id);
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
