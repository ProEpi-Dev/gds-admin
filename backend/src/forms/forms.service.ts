import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateFormDto } from './dto/create-form.dto';
import { UpdateFormDto } from './dto/update-form.dto';
import { FormQueryDto } from './dto/form-query.dto';
import { FormResponseDto } from './dto/form-response.dto';
import { ListResponseDto } from '../common/dto/list-response.dto';
import {
  createPaginationMeta,
  createPaginationLinks,
} from '../common/helpers/pagination.helper';
import {
  getUserContextId,
  getUserContextAsManager,
} from '../common/helpers/user-context.helper';
import { AuthzService } from '../authz/authz.service';
import { ContextResponseDto } from '../contexts/dto/context-response.dto';
import { FormVersionResponseDto } from '../form-versions/dto/form-version-response.dto';
import { FormWithVersionDto } from './dto/form-with-version.dto';

@Injectable()
export class FormsService {
  constructor(
    private prisma: PrismaService,
    private authz: AuthzService,
  ) {}

  async create(
    createFormDto: CreateFormDto,
    userId: number,
  ): Promise<FormResponseDto> {
    const isAdmin = await this.authz.isAdmin(userId);
    let contextId: number;

    if (isAdmin) {
      if (createFormDto.contextId == null) {
        throw new BadRequestException(
          'Admin deve informar o contexto (contextId) em que o formulário será criado',
        );
      }
      const context = await this.prisma.context.findUnique({
        where: { id: createFormDto.contextId, active: true },
      });
      if (!context) {
        throw new BadRequestException(
          `Contexto com ID ${createFormDto.contextId} não encontrado ou está inativo`,
        );
      }
      contextId = createFormDto.contextId;
    } else {
      contextId = await getUserContextAsManager(this.prisma, userId);
    }

    // Preparar dados
    const data: any = {
      title: createFormDto.title,
      type: createFormDto.type,
      active: createFormDto.active ?? true,
      context_id: contextId,
    };

    if (createFormDto.reference !== undefined) {
      data.reference = createFormDto.reference;
    }

    if (createFormDto.description !== undefined) {
      data.description = createFormDto.description;
    }

    // Criar formulário
    const form = await this.prisma.form.create({ data });

    return this.mapToResponseDto(form);
  }

  async findFormsWithLatestVersions(
    userId: number,
    contextId?: number,
  ): Promise<FormWithVersionDto[]> {
    let filterContextId: number;
    const isAdmin = await this.authz.isAdmin(userId);
    if (isAdmin && contextId != null) {
      filterContextId = contextId;
    } else if (isAdmin) {
      // Admin sem contextId: listar todos os formulários
      filterContextId = undefined as any;
    } else {
      filterContextId = await getUserContextId(this.prisma, userId);
    }

    const where: any = { active: true };
    if (filterContextId != null) where.context_id = filterContextId;

    // Buscar formulários ativos com suas últimas versões
    const forms = await this.prisma.form.findMany({
      where,
      include: {
        form_version: {
          where: { active: true },
          orderBy: { version_number: 'desc' },
          take: 1,
        },
      },
    });

    // Filtrar apenas formulários que têm versões ativas e formatar para dropdown
    return forms
      .filter((form) => form.form_version.length > 0)
      .map((form) => ({
        formId: form.id,
        formTitle: form.title,
        version: {
          id: form.form_version[0].id,
          formId: form.form_version[0].form_id,
          versionNumber: form.form_version[0].version_number,
          accessType: form.form_version[0].access_type,
          definition: form.form_version[0].definition,
          active: form.form_version[0].active,
          createdAt: form.form_version[0].created_at,
          updatedAt: form.form_version[0].updated_at,
        },
      }));
  }

  async findAll(
    query: FormQueryDto,
    userId: number,
  ): Promise<ListResponseDto<FormResponseDto>> {
    const page = query.page || 1;
    const pageSize = query.pageSize || 20;
    const skip = (page - 1) * pageSize;

    const isAdmin = await this.authz.isAdmin(userId);
    let contextId: number;
    if (isAdmin) {
      if (query.contextId == null) {
        throw new BadRequestException(
          'contextId é obrigatório para listar formulários. O backend sempre restringe a um contexto para evitar vazamento de dados.',
        );
      }
      contextId = query.contextId;
    } else {
      contextId = await getUserContextId(this.prisma, userId);
    }

    // Construir filtros (sempre por contexto)
    const where: any = { context_id: contextId };

    if (query.active !== undefined) {
      where.active = query.active;
    } else {
      // Por padrão, mostrar apenas formulários ativos
      where.active = true;
    }

    if (query.type !== undefined) {
      where.type = query.type;
    }

    if (query.reference !== undefined) {
      where.reference = query.reference;
    }

    // Buscar formulários e total
    const [forms, totalItems] = await Promise.all([
      this.prisma.form.findMany({
        where,
        skip,
        take: pageSize,
        orderBy: { created_at: 'desc' },
        include: {
          context: true,
          form_version: {
            where: { active: true },
            orderBy: { version_number: 'desc' },
            take: 1,
          },
        },
      }),
      this.prisma.form.count({ where }),
    ]);

    // Criar resposta paginada
    const baseUrl = '/v1/forms';
    const queryParams: Record<string, any> = {};
    if (query.active !== undefined) queryParams.active = query.active;
    if (query.type !== undefined) queryParams.type = query.type;
    if (query.reference !== undefined) queryParams.reference = query.reference;
    if (query.contextId !== undefined) queryParams.contextId = query.contextId;

    return {
      data: forms.map((form) => this.mapToResponseDto(form)),
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

  async findOne(id: number, userId: number): Promise<FormResponseDto> {
    const form = await this.prisma.form.findUnique({
      where: { id },
      include: {
        context: true,
        form_version: {
          where: { active: true },
          orderBy: { version_number: 'desc' },
          take: 1,
        },
      },
    });

    if (!form) {
      throw new NotFoundException(`Formulário com ID ${id} não encontrado`);
    }

    const isAdmin = await this.authz.isAdmin(userId);
    if (!isAdmin) {
      const userContextId = await getUserContextId(this.prisma, userId);
      if (form.context_id !== userContextId) {
        throw new ForbiddenException(
          'Você não tem permissão para visualizar este formulário',
        );
      }
    }

    return this.mapToResponseDto(form);
  }

  async update(
    id: number,
    updateFormDto: UpdateFormDto,
    userId: number,
  ): Promise<FormResponseDto> {
    // Verificar se formulário existe
    const existingForm = await this.prisma.form.findUnique({
      where: { id },
    });

    if (!existingForm) {
      throw new NotFoundException(`Formulário com ID ${id} não encontrado`);
    }

    const isAdmin = await this.authz.isAdmin(userId);
    if (!isAdmin) {
      const userContextId = await getUserContextAsManager(this.prisma, userId);
      if (existingForm.context_id !== userContextId) {
        throw new ForbiddenException(
          'Você não tem permissão para editar este formulário',
        );
      }
    }

    // Preparar dados de atualização
    const updateData: any = {};

    if (updateFormDto.title !== undefined) {
      updateData.title = updateFormDto.title;
    }

    if (updateFormDto.type !== undefined) {
      updateData.type = updateFormDto.type;
    }

    if (updateFormDto.reference !== undefined) {
      updateData.reference = updateFormDto.reference;
    }

    if (updateFormDto.description !== undefined) {
      updateData.description = updateFormDto.description;
    }

    if (updateFormDto.active !== undefined) {
      updateData.active = updateFormDto.active;
    }

    // Atualizar formulário
    const form = await this.prisma.form.update({
      where: { id },
      data: updateData,
    });

    return this.mapToResponseDto(form);
  }

  async remove(id: number, userId: number): Promise<void> {
    // Verificar se formulário existe
    const form = await this.prisma.form.findUnique({
      where: { id },
    });

    if (!form) {
      throw new NotFoundException(`Formulário com ID ${id} não encontrado`);
    }

    const isAdmin = await this.authz.isAdmin(userId);
    if (!isAdmin) {
      const userContextId = await getUserContextAsManager(this.prisma, userId);
      if (form.context_id !== userContextId) {
        throw new ForbiddenException(
          'Você não tem permissão para deletar este formulário',
        );
      }
    }

    // Buscar todas as versões associadas
    const versions = await this.prisma.form_version.findMany({
      where: { form_id: id },
      select: { id: true },
    });

    // Verificar se alguma versão tem reports associados
    for (const version of versions) {
      const reportsCount = await this.prisma.report.count({
        where: { form_version_id: version.id },
      });

      if (reportsCount > 0) {
        throw new BadRequestException(
          `Não é possível deletar formulário. A versão ${version.id} possui ${reportsCount} report(s) associado(s)`,
        );
      }
    }

    // Soft delete de todas as versões associadas
    if (versions.length > 0) {
      await this.prisma.form_version.updateMany({
        where: { form_id: id },
        data: { active: false },
      });
    }

    // Soft delete - apenas desativar o formulário
    await this.prisma.form.update({
      where: { id },
      data: { active: false },
    });
  }

  private mapToResponseDto(form: any): FormResponseDto {
    const contextDto: ContextResponseDto | null = form.context
      ? {
          id: form.context.id,
          locationId: form.context.location_id,
          name: form.context.name,
          description: form.context.description,
          type: form.context.type,
          accessType: form.context.access_type,
          active: form.context.active,
          createdAt: form.context.created_at,
          updatedAt: form.context.updated_at,
          modules: (form.context.context_module ?? []).map(
            (item: any) => item.module_code,
          ),
        }
      : null;

    const latestVersionDto: FormVersionResponseDto | null =
      form.form_version && form.form_version.length > 0
        ? {
            id: form.form_version[0].id,
            formId: form.form_version[0].form_id,
            versionNumber: form.form_version[0].version_number,
            accessType: form.form_version[0].access_type,
            definition: form.form_version[0].definition,
            active: form.form_version[0].active,
            createdAt: form.form_version[0].created_at,
            updatedAt: form.form_version[0].updated_at,
            passingScore:
              form.form_version[0].passing_score !== null
                ? Number(form.form_version[0].passing_score)
                : null,
            maxAttempts: form.form_version[0].max_attempts,
            timeLimitMinutes: form.form_version[0].time_limit_minutes,
            showFeedback: form.form_version[0].show_feedback ?? true,
            randomizeQuestions:
              form.form_version[0].randomize_questions ?? false,
          }
        : null;

    return {
      id: form.id,
      contextId: form.context_id,
      context: contextDto,
      title: form.title,
      reference: form.reference,
      description: form.description,
      type: form.type,
      active: form.active,
      createdAt: form.created_at,
      updatedAt: form.updated_at,
      latestVersion: latestVersionDto,
    };
  }
}
