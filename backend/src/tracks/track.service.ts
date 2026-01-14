import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class TrackService {
  constructor(private prisma: PrismaService) {}

  async create(data: any) {
    const { sections, ...trackData } = data;

    // Handle empty date strings
    if (trackData.start_date === '') trackData.start_date = undefined;
    if (trackData.end_date === '') trackData.end_date = undefined;

    return this.prisma.track.create({
      data: {
        ...trackData,
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

  async list() {
    return this.prisma.track.findMany({
      where: { active: true },
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

  async update(id: number, data: any) {
    const { sections, ...trackData } = data;

    // Handle empty date strings
    if (trackData.start_date === '') trackData.start_date = undefined;
    if (trackData.end_date === '') trackData.end_date = undefined;

    // First update the track
    await this.prisma.track.update({
      where: { id },
      data: trackData,
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
