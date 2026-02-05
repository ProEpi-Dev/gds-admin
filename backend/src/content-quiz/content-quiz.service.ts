import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateContentQuizDto } from './dto/create-content-quiz.dto';
import { UpdateContentQuizDto } from './dto/update-content-quiz.dto';
import { ContentQuizQueryDto } from './dto/content-quiz-query.dto';
import { ContentQuizResponseDto } from './dto/content-quiz-response.dto';
import { ListResponseDto } from '../common/dto/list-response.dto';
import {
  createPaginationMeta,
  createPaginationLinks,
} from '../common/helpers/pagination.helper';

@Injectable()
export class ContentQuizService {
  constructor(private prisma: PrismaService) {}

  async create(
    createContentQuizDto: CreateContentQuizDto,
  ): Promise<ContentQuizResponseDto> {
    // Validar se o conteúdo existe
    const content = await this.prisma.content.findUnique({
      where: { id: createContentQuizDto.contentId },
    });

    if (!content) {
      throw new BadRequestException(
        `Conteúdo com ID ${createContentQuizDto.contentId} não encontrado`,
      );
    }

    // Validar se o formulário existe e é do tipo quiz
    const form = await this.prisma.form.findUnique({
      where: { id: createContentQuizDto.formId },
    });

    if (!form) {
      throw new BadRequestException(
        `Formulário com ID ${createContentQuizDto.formId} não encontrado`,
      );
    }

    if (form.type !== 'quiz') {
      throw new BadRequestException(
        `Formulário com ID ${createContentQuizDto.formId} não é do tipo quiz`,
      );
    }

    // Verificar se já existe associação
    const existing = await this.prisma.content_quiz.findFirst({
      where: {
        content_id: createContentQuizDto.contentId,
        form_id: createContentQuizDto.formId,
      },
    });

    if (existing) {
      throw new BadRequestException(
        'Já existe uma associação entre este conteúdo e este quiz',
      );
    }

    // Criar associação
    const contentQuiz = await this.prisma.content_quiz.create({
      data: {
        content_id: createContentQuizDto.contentId,
        form_id: createContentQuizDto.formId,
        display_order: createContentQuizDto.displayOrder ?? 0,
        is_required: createContentQuizDto.isRequired ?? false,
        weight: createContentQuizDto.weight ?? 1.0,
        active: createContentQuizDto.active ?? true,
      },
    });

    return this.mapToResponseDto(contentQuiz);
  }

  async findAll(
    query: ContentQuizQueryDto,
  ): Promise<ListResponseDto<ContentQuizResponseDto>> {
    const page = query.page || 1;
    const pageSize = query.pageSize || 20;
    const skip = (page - 1) * pageSize;

    // Construir filtros
    const where: any = {};

    if (query.active !== undefined) {
      where.active = query.active;
    } else {
      // Por padrão, mostrar apenas associações ativas
      where.active = true;
    }

    if (query.contentId !== undefined) {
      where.content_id = query.contentId;
    }

    if (query.formId !== undefined) {
      where.form_id = query.formId;
    }

    // Buscar associações e total
    const [contentQuizzes, totalItems] = await Promise.all([
      this.prisma.content_quiz.findMany({
        where,
        skip,
        take: pageSize,
        orderBy: [{ content_id: 'asc' }, { display_order: 'asc' }],
        include: {
          content: {
            select: {
              id: true,
              title: true,
              reference: true,
            },
          },
          form: {
            select: {
              id: true,
              title: true,
              reference: true,
              type: true,
            },
          },
        },
      }),
      this.prisma.content_quiz.count({ where }),
    ]);

    // Criar resposta paginada
    const baseUrl = '/v1/content-quiz';
    const queryParams: Record<string, any> = {};
    if (query.active !== undefined) queryParams.active = query.active;
    if (query.contentId !== undefined) queryParams.contentId = query.contentId;
    if (query.formId !== undefined) queryParams.formId = query.formId;

    return {
      data: contentQuizzes.map((cq) => this.mapToResponseDto(cq)),
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

  async findOne(id: number): Promise<ContentQuizResponseDto> {
    const contentQuiz = await this.prisma.content_quiz.findUnique({
      where: { id },
      include: {
        content: {
          select: {
            id: true,
            title: true,
            reference: true,
          },
        },
        form: {
          select: {
            id: true,
            title: true,
            reference: true,
            type: true,
          },
        },
      },
    });

    if (!contentQuiz) {
      throw new NotFoundException(
        `Associação conteúdo-quiz com ID ${id} não encontrada`,
      );
    }

    return this.mapToResponseDto(contentQuiz);
  }

  async update(
    id: number,
    updateContentQuizDto: UpdateContentQuizDto,
  ): Promise<ContentQuizResponseDto> {
    // Verificar se associação existe
    const existing = await this.prisma.content_quiz.findUnique({
      where: { id },
    });

    if (!existing) {
      throw new NotFoundException(
        `Associação conteúdo-quiz com ID ${id} não encontrada`,
      );
    }

    // Preparar dados de atualização
    const updateData: any = {};

    if (updateContentQuizDto.displayOrder !== undefined) {
      updateData.display_order = updateContentQuizDto.displayOrder;
    }

    if (updateContentQuizDto.isRequired !== undefined) {
      updateData.is_required = updateContentQuizDto.isRequired;
    }

    if (updateContentQuizDto.weight !== undefined) {
      updateData.weight = updateContentQuizDto.weight;
    }

    if (updateContentQuizDto.active !== undefined) {
      updateData.active = updateContentQuizDto.active;
    }

    // Atualizar associação
    const contentQuiz = await this.prisma.content_quiz.update({
      where: { id },
      data: updateData,
      include: {
        content: {
          select: {
            id: true,
            title: true,
            reference: true,
          },
        },
        form: {
          select: {
            id: true,
            title: true,
            reference: true,
            type: true,
          },
        },
      },
    });

    return this.mapToResponseDto(contentQuiz);
  }

  async remove(id: number): Promise<void> {
    // Verificar se associação existe
    const contentQuiz = await this.prisma.content_quiz.findUnique({
      where: { id },
    });

    if (!contentQuiz) {
      throw new NotFoundException(
        `Associação conteúdo-quiz com ID ${id} não encontrada`,
      );
    }

    // Soft delete
    await this.prisma.content_quiz.update({
      where: { id },
      data: { active: false },
    });
  }

  private mapToResponseDto(contentQuiz: any): ContentQuizResponseDto {
    const dto: ContentQuizResponseDto = {
      id: contentQuiz.id,
      contentId: contentQuiz.content_id,
      formId: contentQuiz.form_id,
      displayOrder: contentQuiz.display_order,
      isRequired: contentQuiz.is_required,
      weight: Number(contentQuiz.weight),
      active: contentQuiz.active,
      createdAt: contentQuiz.created_at,
      updatedAt: contentQuiz.updated_at,
    };

    // Incluir dados relacionados se existirem
    if (contentQuiz.content) {
      dto.content = {
        id: contentQuiz.content.id,
        title: contentQuiz.content.title,
        reference: contentQuiz.content.reference,
      };
    }

    if (contentQuiz.form) {
      dto.form = {
        id: contentQuiz.form.id,
        title: contentQuiz.form.title,
        reference: contentQuiz.form.reference,
        type: contentQuiz.form.type,
      };
    }

    return dto;
  }
}
