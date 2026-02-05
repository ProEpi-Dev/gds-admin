import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateFormVersionDto } from './dto/create-form-version.dto';
import { UpdateFormVersionDto } from './dto/update-form-version.dto';
import { FormVersionQueryDto } from './dto/form-version-query.dto';
import { FormVersionResponseDto } from './dto/form-version-response.dto';
import { ListResponseDto } from '../common/dto/list-response.dto';
import {
  createPaginationMeta,
  createPaginationLinks,
} from '../common/helpers/pagination.helper';

@Injectable()
export class FormVersionsService {
  constructor(private prisma: PrismaService) {}

  async create(
    formId: number,
    createFormVersionDto: CreateFormVersionDto,
  ): Promise<FormVersionResponseDto> {
    // Validar formulário
    const form = await this.prisma.form.findUnique({
      where: { id: formId },
    });

    if (!form) {
      throw new NotFoundException(`Formulário com ID ${formId} não encontrado`);
    }

    // Buscar a última versão para calcular o próximo número
    const lastVersion = await this.prisma.form_version.findFirst({
      where: {
        form_id: formId,
      },
      orderBy: { version_number: 'desc' },
    });

    // Calcular o próximo número de versão
    const nextVersionNumber = lastVersion ? lastVersion.version_number + 1 : 1;

    // Criar versão do formulário
    const formVersion = await this.prisma.form_version.create({
      data: {
        form_id: formId,
        version_number: nextVersionNumber,
        access_type: createFormVersionDto.accessType,
        definition: createFormVersionDto.definition,
        active: createFormVersionDto.active ?? true,
      },
    });

    return this.mapToResponseDto(formVersion);
  }

  async findAllByForm(
    formId: number,
    query: FormVersionQueryDto,
  ): Promise<ListResponseDto<FormVersionResponseDto>> {
    // Validar formulário
    const form = await this.prisma.form.findUnique({
      where: { id: formId },
    });

    if (!form) {
      throw new NotFoundException(`Formulário com ID ${formId} não encontrado`);
    }

    const page = query.page || 1;
    const pageSize = query.pageSize || 20;
    const skip = (page - 1) * pageSize;

    // Construir filtros
    const where: any = {
      form_id: formId,
    };

    if (query.active !== undefined) {
      where.active = query.active;
    } else {
      // Por padrão, mostrar apenas versões ativas
      where.active = true;
    }

    // Buscar versões e total
    const [versions, totalItems] = await Promise.all([
      this.prisma.form_version.findMany({
        where,
        skip,
        take: pageSize,
        orderBy: { version_number: 'desc' },
      }),
      this.prisma.form_version.count({ where }),
    ]);

    // Criar resposta paginada
    const baseUrl = `/v1/forms/${formId}/versions`;
    const queryParams: Record<string, any> = {};
    if (query.active !== undefined) queryParams.active = query.active;

    return {
      data: versions.map((version) => this.mapToResponseDto(version)),
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

  async findOne(formId: number, id: number): Promise<FormVersionResponseDto> {
    // Validar formulário
    const form = await this.prisma.form.findUnique({
      where: { id: formId },
    });

    if (!form) {
      throw new NotFoundException(`Formulário com ID ${formId} não encontrado`);
    }

    const formVersion = await this.prisma.form_version.findFirst({
      where: {
        id,
        form_id: formId,
      },
    });

    if (!formVersion) {
      throw new NotFoundException(
        `Versão do formulário com ID ${id} não encontrada no formulário ${formId}`,
      );
    }

    return this.mapToResponseDto(formVersion);
  }

  async update(
    formId: number,
    id: number,
    updateFormVersionDto: UpdateFormVersionDto,
  ): Promise<FormVersionResponseDto> {
    // Verificar se versão existe e pertence ao formulário
    const existingVersion = await this.prisma.form_version.findFirst({
      where: {
        id,
        form_id: formId,
      },
    });

    if (!existingVersion) {
      throw new NotFoundException(
        `Versão do formulário com ID ${id} não encontrada no formulário ${formId}`,
      );
    }

    // Se a definition está sendo atualizada, criar uma nova versão
    if (updateFormVersionDto.definition !== undefined) {
      // Verificar se a definition realmente mudou
      const definitionChanged =
        JSON.stringify(updateFormVersionDto.definition) !==
        JSON.stringify(existingVersion.definition);

      if (definitionChanged) {
        // Buscar a última versão para calcular o próximo número
        const lastVersion = await this.prisma.form_version.findFirst({
          where: {
            form_id: formId,
          },
          orderBy: { version_number: 'desc' },
        });

        // Calcular o próximo número de versão
        const nextVersionNumber = lastVersion
          ? lastVersion.version_number + 1
          : 1;

        // Criar nova versão com os dados atualizados
        const newVersion = await this.prisma.form_version.create({
          data: {
            form_id: formId,
            version_number: nextVersionNumber,
            access_type:
              updateFormVersionDto.accessType !== undefined
                ? updateFormVersionDto.accessType
                : existingVersion.access_type,
            definition: updateFormVersionDto.definition,
            active:
              updateFormVersionDto.active !== undefined
                ? updateFormVersionDto.active
                : true,
            passing_score:
              updateFormVersionDto.passingScore !== undefined
                ? updateFormVersionDto.passingScore
                : existingVersion.passing_score,
            max_attempts:
              updateFormVersionDto.maxAttempts !== undefined
                ? updateFormVersionDto.maxAttempts
                : existingVersion.max_attempts,
            time_limit_minutes:
              updateFormVersionDto.timeLimitMinutes !== undefined
                ? updateFormVersionDto.timeLimitMinutes
                : existingVersion.time_limit_minutes,
            show_feedback:
              updateFormVersionDto.showFeedback !== undefined
                ? updateFormVersionDto.showFeedback
                : existingVersion.show_feedback,
            randomize_questions:
              updateFormVersionDto.randomizeQuestions !== undefined
                ? updateFormVersionDto.randomizeQuestions
                : existingVersion.randomize_questions,
          },
        });

        return this.mapToResponseDto(newVersion);
      }
    }

    // Se não há mudança na definition ou apenas outros campos estão sendo atualizados,
    // atualizar a versão existente (mas não permitir mudança de número de versão)
    const updateData: any = {};

    if (updateFormVersionDto.accessType !== undefined) {
      updateData.access_type = updateFormVersionDto.accessType;
    }

    if (updateFormVersionDto.definition !== undefined) {
      updateData.definition = updateFormVersionDto.definition;
    }

    if (updateFormVersionDto.active !== undefined) {
      updateData.active = updateFormVersionDto.active;
    }

    if (updateFormVersionDto.passingScore !== undefined) {
      updateData.passing_score = updateFormVersionDto.passingScore;
    }

    if (updateFormVersionDto.maxAttempts !== undefined) {
      updateData.max_attempts = updateFormVersionDto.maxAttempts;
    }

    if (updateFormVersionDto.timeLimitMinutes !== undefined) {
      updateData.time_limit_minutes = updateFormVersionDto.timeLimitMinutes;
    }

    if (updateFormVersionDto.showFeedback !== undefined) {
      updateData.show_feedback = updateFormVersionDto.showFeedback;
    }

    if (updateFormVersionDto.randomizeQuestions !== undefined) {
      updateData.randomize_questions = updateFormVersionDto.randomizeQuestions;
    }

    // Atualizar versão
    const formVersion = await this.prisma.form_version.update({
      where: { id },
      data: updateData,
    });

    return this.mapToResponseDto(formVersion);
  }

  async remove(formId: number, id: number): Promise<void> {
    // Verificar se versão existe e pertence ao formulário
    const formVersion = await this.prisma.form_version.findFirst({
      where: {
        id,
        form_id: formId,
      },
    });

    if (!formVersion) {
      throw new NotFoundException(
        `Versão do formulário com ID ${id} não encontrada no formulário ${formId}`,
      );
    }

    // Verificar se há reports associados
    const reports = await this.prisma.report.count({
      where: { form_version_id: id },
    });

    if (reports > 0) {
      throw new BadRequestException(
        `Não é possível deletar versão com ${reports} report(s) associado(s)`,
      );
    }

    // Soft delete - apenas desativar
    await this.prisma.form_version.update({
      where: { id },
      data: { active: false },
    });
  }

  private mapToResponseDto(formVersion: any): FormVersionResponseDto {
    return {
      id: formVersion.id,
      formId: formVersion.form_id,
      versionNumber: formVersion.version_number,
      accessType: formVersion.access_type,
      definition: formVersion.definition,
      active: formVersion.active,
      createdAt: formVersion.created_at,
      updatedAt: formVersion.updated_at,
      passingScore:
        formVersion.passing_score !== null
          ? Number(formVersion.passing_score)
          : null,
      maxAttempts: formVersion.max_attempts,
      timeLimitMinutes: formVersion.time_limit_minutes,
      showFeedback: formVersion.show_feedback ?? true,
      randomizeQuestions: formVersion.randomize_questions ?? false,
    };
  }
}
