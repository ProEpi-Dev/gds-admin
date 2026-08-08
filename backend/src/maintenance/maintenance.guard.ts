import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ServiceUnavailableException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PinoLogger, InjectPinoLogger } from 'nestjs-pino';
import { AuthzService } from '../authz/authz.service';
import { ALLOW_DURING_MAINTENANCE_KEY } from '../common/decorators/allow-during-maintenance.decorator';
import {
  ActiveMaintenanceWindow,
  MaintenanceService,
} from './maintenance.service';

/**
 * Responde 503 enquanto houver janela de indisponibilidade ativa.
 *
 * Registrado depois do JwtAuthGuard de propósito: só assim `request.user` já
 * está resolvido e o bypass de admin funciona. O efeito colateral é que uma
 * requisição sem token para endpoint protegido recebe 401 em vez de 503 —
 * aceitável, já que os endpoints que o cliente usa para descobrir a manutenção
 * (health e login) estão liberados.
 *
 * Não alcança o Swagger UI em `/api`, que é rota Express e não passa por guards.
 */
@Injectable()
export class MaintenanceGuard implements CanActivate {
  private static readonly SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);

  constructor(
    private readonly reflector: Reflector,
    private readonly maintenance: MaintenanceService,
    private readonly authz: AuthzService,
    @InjectPinoLogger(MaintenanceGuard.name)
    private readonly logger: PinoLogger,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    if (this.isAllowlisted(context)) {
      return true;
    }

    const window = await this.maintenance.getActiveWindow();
    if (!window || window.mode === 'banner') {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    if (MaintenanceGuard.isReadAllowed(window, request)) {
      return true;
    }
    if (await this.isMaintenanceAdmin(request)) {
      return true;
    }

    throw this.buildException(window, request);
  }

  private isAllowlisted(context: ExecutionContext): boolean {
    return (
      this.reflector.getAllAndOverride<boolean>(ALLOW_DURING_MAINTENANCE_KEY, [
        context.getHandler(),
        context.getClass(),
      ]) === true
    );
  }

  /** `read_only` existe para congelar escrita sem derrubar a leitura. */
  private static isReadAllowed(
    window: ActiveMaintenanceWindow,
    request: { method?: string },
  ): boolean {
    return (
      window.mode === 'read_only' &&
      MaintenanceGuard.SAFE_METHODS.has(request.method ?? '')
    );
  }

  /** Sem esse bypass o admin não consegue encerrar a própria janela. */
  private async isMaintenanceAdmin(request: {
    user?: { userId?: unknown };
  }): Promise<boolean> {
    const userId = request.user?.userId;
    if (typeof userId !== 'number') {
      return false;
    }
    return this.authz.isAdmin(userId);
  }

  private buildException(
    window: ActiveMaintenanceWindow,
    request: {
      method?: string;
      url?: string;
      headers?: Record<string, unknown>;
    },
  ): ServiceUnavailableException {
    const acceptLanguage = request.headers?.['accept-language'];
    const language =
      typeof acceptLanguage === 'string' ? acceptLanguage : undefined;

    this.logger.warn(
      {
        event: 'MAINTENANCE_BLOCKED',
        mode: window.mode,
        method: request.method,
        url: request.url,
      },
      'Requisição bloqueada por janela de indisponibilidade',
    );

    return new ServiceUnavailableException({
      code: 'MAINTENANCE',
      message: this.maintenance.resolveText(window.message, language),
      maintenance: {
        mode: window.mode,
        title: this.maintenance.resolveText(window.title, language),
        startsAt: window.startsAt.toISOString(),
        endsAt: window.endsAt ? window.endsAt.toISOString() : null,
      },
    });
  }
}
