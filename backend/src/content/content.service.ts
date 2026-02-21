import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class ContentService {
  constructor(private prisma: PrismaService) {}

  private mapContentPersistenceError(error: unknown): never {
    if (error instanceof Error) {
      const message = error.message || '';

      if (
        message.includes('code: "54000"') ||
        message.includes('index row requires')
      ) {
        throw new BadRequestException({
          code: 'CONTENT_THUMBNAIL_TOO_LARGE',
          message:
            'A thumbnail selecionada é muito grande para ser salva. Tente uma imagem menor.',
        });
      }
    }

    throw new InternalServerErrorException({
      code: 'CONTENT_PERSISTENCE_ERROR',
      message: 'Erro ao salvar conteúdo.',
    });
  }

  async create(data: any) {
    const { tags, active, published_at, ...contentData } = data;

    try {
      if (tags && tags.length > 0) {
        const existingTags = await this.prisma.tag.findMany({
          where: { id: { in: tags } },
        });

        const existingTagIds = existingTags.map((t) => t.id);

        return this.prisma.content.create({
          data: {
            ...contentData,
            active: active ?? true,
            published_at:
              (active ?? true) ? (published_at ?? new Date()) : null,
            content_tag: {
              create: existingTagIds.map((tagId) => ({
                tag: { connect: { id: tagId } },
              })),
            },
          },
          include: {
            content_tag: {
              include: {
                tag: true,
              },
            },
            content_type: true,
          },
        });
      }

      return this.prisma.content.create({
        data: {
          ...contentData,
          active: active ?? true,
          published_at: (active ?? true) ? (published_at ?? new Date()) : null,
        },
        include: {
          content_tag: {
            include: {
              tag: true,
            },
          },
          content_type: true,
        },
      });
    } catch (error) {
      this.mapContentPersistenceError(error);
    }
  }

  async list() {
    return this.prisma.content.findMany({
      where: { active: true },
      include: {
        content_tag: {
          include: {
            tag: true,
          },
        },
        content_type: true,
      },
      orderBy: { updated_at: 'desc' },
    });
  }

  async get(id: number) {
    return this.prisma.content.findUnique({
      where: { id },
      include: {
        content_tag: {
          include: {
            tag: true,
          },
        },
        content_type: true,
      },
    });
  }

  async update(id: number, data: any) {
    const { tags, ...contentData } = data;

    try {
      if (tags && tags.length > 0) {
        const existingTags = await this.prisma.tag.findMany({
          where: { id: { in: tags } },
        });

        const existingTagIds = existingTags.map((t) => t.id);

        return this.prisma.content.update({
          where: { id },
          data: {
            ...contentData,
            updated_at: new Date(),
            content_tag: {
              deleteMany: {},
              create: existingTagIds.map((tagId) => ({
                tag: { connect: { id: tagId } },
              })),
            },
          },
          include: {
            content_tag: {
              include: {
                tag: true,
              },
            },
            content_type: true,
          },
        });
      }

      return this.prisma.content.update({
        where: { id },
        data: {
          ...contentData,
          updated_at: new Date(),
        },
        include: {
          content_tag: {
            include: {
              tag: true,
            },
          },
          content_type: true,
        },
      });
    } catch (error) {
      this.mapContentPersistenceError(error);
    }
  }

  async delete(id: number) {
    return this.prisma.content.update({
      where: { id },
      data: { active: false },
    });
  }
}
