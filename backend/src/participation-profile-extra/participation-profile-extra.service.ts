import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { FormVersionResponseDto } from '../form-versions/dto/form-version-response.dto';
import { SaveParticipationProfileExtraDto } from './dto/save-participation-profile-extra.dto';
import {
  ParticipationProfileExtraMeResponseDto,
  ProfileExtraFormWithVersionDto,
  ProfileExtraSubmissionDto,
} from './dto/participation-profile-extra-me-response.dto';
import { form_type_enum } from '@prisma/client';

@Injectable()
export class ParticipationProfileExtraService {
  constructor(private readonly prisma: PrismaService) {}

  /** Mesma regra de “participação ativa” usada no login (datas + active). */
  private async findActiveParticipationForUser(userId: number) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    today.setMinutes(0);
    today.setSeconds(0);
    today.setMilliseconds(0);

    const participations = await this.prisma.participation.findMany({
      where: { user_id: userId, active: true },
      orderBy: { created_at: 'desc' },
    });

    return participations.find((participation) => {
      const startDate = new Date(participation.start_date);
      startDate.setHours(0, 0, 0, 0);
      startDate.setMinutes(0);
      startDate.setSeconds(0);
      startDate.setMilliseconds(0);
      if (startDate > today) return false;
      if (!participation.end_date) return true;
      const endDate = new Date(participation.end_date);
      endDate.setHours(0, 0, 0, 0);
      endDate.setMinutes(0);
      endDate.setSeconds(0);
      endDate.setMilliseconds(0);
      return endDate >= today;
    });
  }

  private versionHasFields(version: { definition: unknown }): boolean {
    const def = version.definition as { fields?: unknown[] };
    return Array.isArray(def?.fields) && def.fields.length > 0;
  }

  private mapFormVersion(formVersion: {
    id: number;
    form_id: number;
    version_number: number;
    access_type: string;
    definition: unknown;
    active: boolean;
    created_at: Date;
    updated_at: Date;
    passing_score: unknown;
    max_attempts: number | null;
    time_limit_minutes: number | null;
    show_feedback: boolean | null;
    randomize_questions: boolean | null;
  }): FormVersionResponseDto {
    return {
      id: formVersion.id,
      formId: formVersion.form_id,
      versionNumber: formVersion.version_number,
      accessType: formVersion.access_type as FormVersionResponseDto['accessType'],
      definition: formVersion.definition,
      active: formVersion.active,
      createdAt: formVersion.created_at,
      updatedAt: formVersion.updated_at,
      passingScore:
        formVersion.passing_score !== null && formVersion.passing_score !== undefined
          ? Number(formVersion.passing_score)
          : null,
      maxAttempts: formVersion.max_attempts,
      timeLimitMinutes: formVersion.time_limit_minutes,
      showFeedback: formVersion.show_feedback ?? true,
      randomizeQuestions: formVersion.randomize_questions ?? false,
    };
  }

  /**
   * Um formulário profile_extra ativo por contexto: se existir mais de um, usa o de menor id.
   */
  private async findProfileExtraFormForContext(contextId: number) {
    return this.prisma.form.findFirst({
      where: {
        context_id: contextId,
        type: form_type_enum.profile_extra,
        active: true,
      },
      orderBy: { id: 'asc' },
      include: {
        form_version: {
          where: { active: true },
          orderBy: { version_number: 'desc' },
          take: 1,
        },
      },
    });
  }

  async getProfileExtraCompletion(
    userId: number,
  ): Promise<{ required: boolean; complete: boolean }> {
    const participation = await this.findActiveParticipationForUser(userId);
    if (!participation) {
      return { required: false, complete: true };
    }

    const profileForm = await this.findProfileExtraFormForContext(
      participation.context_id,
    );
    if (!profileForm || profileForm.form_version.length === 0) {
      return { required: false, complete: true };
    }

    const latest = profileForm.form_version[0];
    if (!this.versionHasFields(latest)) {
      return { required: false, complete: true };
    }

    const latestVersionId = latest.id;
    const row = await this.prisma.participation_profile_extra.findUnique({
      where: {
        participation_id_form_id: {
          participation_id: participation.id,
          form_id: profileForm.id,
        },
      },
    });

    const complete =
      !!row &&
      row.active &&
      row.form_version_id === latestVersionId;

    return { required: true, complete };
  }

  async getMe(userId: number): Promise<ParticipationProfileExtraMeResponseDto> {
    const participation = await this.findActiveParticipationForUser(userId);
    if (!participation) {
      return { form: null, submission: null };
    }

    const profileForm = await this.findProfileExtraFormForContext(
      participation.context_id,
    );
    if (!profileForm || profileForm.form_version.length === 0) {
      return { form: null, submission: null };
    }

    const version = profileForm.form_version[0];
    if (!this.versionHasFields(version)) {
      return { form: null, submission: null };
    }
    const formOut: ProfileExtraFormWithVersionDto = {
      id: profileForm.id,
      title: profileForm.title,
      reference: profileForm.reference,
      type: profileForm.type,
      version: this.mapFormVersion(version),
    };

    const row = await this.prisma.participation_profile_extra.findUnique({
      where: {
        participation_id_form_id: {
          participation_id: participation.id,
          form_id: profileForm.id,
        },
      },
    });

    let submission: ProfileExtraSubmissionDto | null = null;
    if (row?.active) {
      submission = {
        formVersionId: row.form_version_id,
        response: row.response as Record<string, unknown>,
        updatedAt: row.updated_at,
      };
    }

    return { form: formOut, submission };
  }

  async saveMe(
    userId: number,
    dto: SaveParticipationProfileExtraDto,
  ): Promise<ProfileExtraSubmissionDto> {
    const participation = await this.findActiveParticipationForUser(userId);
    if (!participation) {
      throw new BadRequestException(
        'Não há participação ativa para salvar dados adicionais de perfil',
      );
    }

    const formVersion = await this.prisma.form_version.findUnique({
      where: { id: dto.formVersionId },
      include: { form: true },
    });

    if (!formVersion || !formVersion.active) {
      throw new NotFoundException(
        `Versão do formulário com ID ${dto.formVersionId} não encontrada ou inativa`,
      );
    }

    if (formVersion.form.type !== form_type_enum.profile_extra) {
      throw new BadRequestException(
        'A versão informada não pertence a um formulário do tipo dados adicionais de perfil',
      );
    }

    if (formVersion.form.context_id !== participation.context_id) {
      throw new ForbiddenException(
        'Este formulário não pertence ao mesmo contexto da sua participação',
      );
    }

    if (!formVersion.form.active) {
      throw new BadRequestException('O formulário está inativo');
    }

    const saved = await this.prisma.participation_profile_extra.upsert({
      where: {
        participation_id_form_id: {
          participation_id: participation.id,
          form_id: formVersion.form_id,
        },
      },
      create: {
        participation_id: participation.id,
        form_id: formVersion.form_id,
        form_version_id: dto.formVersionId,
        response: dto.formResponse as object,
        active: true,
      },
      update: {
        form_version_id: dto.formVersionId,
        response: dto.formResponse as object,
        active: true,
      },
    });

    return {
      formVersionId: saved.form_version_id,
      response: saved.response as Record<string, unknown>,
      updatedAt: saved.updated_at,
    };
  }
}
