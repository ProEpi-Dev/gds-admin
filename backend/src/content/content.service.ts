import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { AuthzService } from '../authz/authz.service';

@Injectable()
export class ContentService {
  private readonly logger = new Logger(ContentService.name);

  constructor(
    private prisma: PrismaService,
    private authz: AuthzService,
  ) {}

  private readonly contentInclude = {
    content_tag: {
      include: {
        tag: true,
      },
    },
    content_type: true,
    /** Sequências que apontam para este conteúdo (para listar trilhas associadas). */
    sequence: {
      include: {
        section: {
          include: {
            track: {
              select: {
                id: true,
                name: true,
                active: true,
              },
            },
          },
        },
      },
    },
    /** Associações conteúdo–quiz (para listagem admin). */
    content_quiz: {
      where: { active: true },
      orderBy: { display_order: 'asc' },
      include: {
        form: {
          select: {
            id: true,
            title: true,
            active: true,
          },
        },
      },
    },
  } as const;

  private async assertCanManageContent(
    userId: number,
    content: { context_id: number | null },
  ): Promise<void> {
    if (content.context_id != null) {
      const ok = await this.authz.hasPermission(
        userId,
        content.context_id,
        'content:write',
      );
      if (!ok) {
        throw new ForbiddenException(
          'Sem permissão para gerenciar este conteúdo.',
        );
      }
      return;
    }
    if (!(await this.authz.isAdmin(userId))) {
      throw new ForbiddenException(
        'Sem permissão para gerenciar este conteúdo.',
      );
    }
  }

  /**
   * Desativação e exclusão permanente exigem ausência de vínculos em trilhas
   * (sequence) e em quizzes do conteúdo (content_quiz).
   */
  private async assertNoTrackOrQuizLinks(
    contentId: number,
    actionMessagePrefix: string,
  ): Promise<void> {
    const [sequencesWithContent, quizLinks] = await Promise.all([
      this.prisma.sequence.count({ where: { content_id: contentId } }),
      this.prisma.content_quiz.count({ where: { content_id: contentId } }),
    ]);

    if (sequencesWithContent > 0 || quizLinks > 0) {
      const reasons: string[] = [];
      if (sequencesWithContent > 0) {
        reasons.push(
          'este conteúdo está vinculado a uma ou mais trilhas (sequências)',
        );
      }
      if (quizLinks > 0) {
        reasons.push('há quiz(es) associados a este conteúdo');
      }
      throw new BadRequestException(
        `${actionMessagePrefix}: ${reasons.join(' e ')}. Remova essas associações antes de tentar novamente.`,
      );
    }
  }

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

  async list(
    contextId: number | undefined,
    userId: number,
    options?: { includeInactive?: boolean },
  ) {
    const filterContextId = await this.authz.resolveListContextId(
      userId,
      contextId,
      'GET /contents',
      { allowParticipantContext: true },
    );

    const where: { context_id: number; active?: boolean } = {
      context_id: filterContextId,
    };

    if (options?.includeInactive) {
      const canSeeInactive = await this.authz.hasPermission(
        userId,
        filterContextId,
        'content:write',
      );
      if (!canSeeInactive) {
        where.active = true;
      }
    } else {
      where.active = true;
    }

    return this.prisma.content.findMany({
      where,
      include: { ...this.contentInclude },
      orderBy: { updated_at: 'desc' },
    });
  }

  async get(id: number) {
    return this.prisma.content.findUnique({
      where: { id },
      include: { ...this.contentInclude },
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
    await this.assertNoTrackOrQuizLinks(
      id,
      'Não é possível desativar o conteúdo',
    );
    return this.prisma.content.update({
      where: { id },
      data: { active: false },
    });
  }

  async reactivate(id: number, userId: number) {
    const content = await this.prisma.content.findUnique({
      where: { id },
    });
    if (!content) {
      throw new NotFoundException(`Conteúdo com ID ${id} não encontrado`);
    }
    await this.assertCanManageContent(userId, content);
    if (content.active) {
      throw new BadRequestException('O conteúdo já está ativo.');
    }
    return this.prisma.content.update({
      where: { id },
      data: {
        active: true,
        published_at: content.published_at ?? new Date(),
        updated_at: new Date(),
      },
      include: { ...this.contentInclude },
    });
  }

  async permanentDelete(id: number, userId: number): Promise<void> {
    const content = await this.prisma.content.findUnique({
      where: { id },
    });
    if (!content) {
      throw new NotFoundException(`Conteúdo com ID ${id} não encontrado`);
    }
    await this.assertCanManageContent(userId, content);
    if (content.active) {
      throw new BadRequestException(
        'Inative o conteúdo antes de excluir permanentemente.',
      );
    }

    await this.assertNoTrackOrQuizLinks(
      id,
      'Não é possível excluir permanentemente o conteúdo',
    );

    try {
      await this.prisma.content.delete({ where: { id } });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2003'
      ) {
        throw new BadRequestException(
          'Não foi possível excluir permanentemente: ainda há referências a este conteúdo.',
        );
      }
      throw error;
    }
  }
}
