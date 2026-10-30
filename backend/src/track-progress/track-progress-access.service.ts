import { ForbiddenException, Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuthzService } from '../authz/authz.service';
import { BusinessMetricsService } from '../telemetry/business-metrics.service';

export type TrackProgressEndpoint =
  | 'start'
  | 'participation-cycle'
  | 'can-access'
  | 'update-sequence'
  | 'complete-content'
  | 'complete-quiz'
  | 'recalculate';

export type TrackProgressAccessMode = 'observe' | 'enforce';

export type TrackProgressAccessRequest = {
  userId: number;
  channel: 'web' | 'app';
  endpoint: TrackProgressEndpoint;
};

type ParticipationOwner = {
  id: number;
  user_id: number;
  context_id: number;
};

/**
 * Quem pode agir sobre o progresso de trilha de uma participação: o dono, admin,
 * ou manager/content_manager do contexto da participação.
 *
 * Modo padrão é observação: o acesso de outra pessoa só é registrado (log e métrica
 * gds_track_progress_access_denied) e a requisição segue como antes. Com
 * TRACK_PROGRESS_AUTHZ_MODE=enforce, o acesso é recusado com 403. A observação vem
 * primeiro para provar que o app em produção não faz esse tipo de acesso.
 */
@Injectable()
export class TrackProgressAccessService {
  private readonly logger = new Logger(TrackProgressAccessService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly authz: AuthzService,
    private readonly metrics: BusinessMetricsService,
  ) {}

  async checkTrackProgress(
    request: TrackProgressAccessRequest,
    trackProgressId: number,
  ): Promise<void> {
    const trackProgress = await this.prisma.track_progress.findUnique({
      where: { id: trackProgressId },
      select: {
        participation: {
          select: { id: true, user_id: true, context_id: true },
        },
      },
    });
    // Progresso inexistente: o serviço segue respondendo 404 como hoje.
    if (!trackProgress) return;
    await this.check(
      request,
      trackProgress.participation,
      `trackProgressId=${trackProgressId}`,
    );
  }

  async checkParticipation(
    request: TrackProgressAccessRequest,
    participationId: number,
  ): Promise<void> {
    const participation = await this.prisma.participation.findUnique({
      where: { id: participationId },
      select: { id: true, user_id: true, context_id: true },
    });
    if (!participation) return;
    await this.check(request, participation, '');
  }

  mode(): TrackProgressAccessMode {
    return process.env.TRACK_PROGRESS_AUTHZ_MODE === 'enforce'
      ? 'enforce'
      : 'observe';
  }

  private async check(
    request: TrackProgressAccessRequest,
    owner: ParticipationOwner,
    detail: string,
  ): Promise<void> {
    if (await this.canAct(request.userId, owner)) return;

    const mode = this.mode();
    this.metrics.recordTrackProgressAccessDenied({
      endpoint: request.endpoint,
      channel: request.channel,
      mode,
    });
    this.logger.warn(
      `[authz-progresso] acesso a progresso de outra pessoa mode=${mode} ` +
        `endpoint=${request.endpoint} channel=${request.channel} ` +
        `userId=${request.userId} participationId=${owner.id} ` +
        `ownerUserId=${owner.user_id} contextId=${owner.context_id} ${detail}`.trim(),
    );

    if (mode === 'enforce') {
      throw new ForbiddenException(
        'Você não tem permissão para acessar o progresso de outro participante',
      );
    }
  }

  private async canAct(
    userId: number,
    owner: ParticipationOwner,
  ): Promise<boolean> {
    if (owner.user_id === userId) return true;
    if (await this.authz.isAdmin(userId)) return true;
    return this.authz.hasAnyRole(userId, owner.context_id, [
      'manager',
      'content_manager',
    ]);
  }
}
