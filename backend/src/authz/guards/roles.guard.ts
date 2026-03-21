import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PinoLogger, InjectPinoLogger } from 'nestjs-pino';
import { AuthzService } from '../authz.service';
import { ROLES_KEY } from '../decorators/roles.decorator';
import { REQUIRE_PERMISSION_KEY } from '../decorators/require-permission.decorator';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    private authz: AuthzService,
    @InjectPinoLogger(RolesGuard.name) private readonly logger: PinoLogger,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requiredRoles = this.reflector.getAllAndOverride<string[]>(
      ROLES_KEY,
      [context.getHandler(), context.getClass()],
    );
    const requiredPermission = this.reflector.getAllAndOverride<string>(
      REQUIRE_PERMISSION_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (!requiredRoles?.length && !requiredPermission) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const { method, url, ip } = request;
    const user = request.user;

    if (!user?.userId) {
      this.logger.warn(
        { event: 'ACCESS_DENIED', reason: 'unauthenticated', method, url, ip },
        'Acesso negado: sem autenticação',
      );
      throw new ForbiddenException('Usuário não autenticado');
    }

    const userId = user.userId as number;

    const contextId =
      request.params?.contextId ??
      request.params?.context_id ??
      request.query?.contextId ??
      request.query?.context_id ??
      request.body?.contextId ??
      request.body?.context_id;

    const ctxLabel = contextId ? Number(contextId) : null;

    if (requiredPermission) {
      const hasIt = await this.authz.hasPermission(
        userId,
        ctxLabel,
        requiredPermission,
      );
      if (!hasIt) {
        const roleSummary = await this.authz.getUserRoleSummary(userId);
        const diagnostico_permissoes =
          await this.authz.getPermissionDiagnosticsForLog(userId, ctxLabel);
        this.logger.warn(
          {
            event: 'ACCESS_DENIED',
            reason: 'insufficient_permission',
            method,
            url,
            userId,
            papel_atual: roleSummary,
            contextId: ctxLabel ?? 'none',
            permissao_necessaria: requiredPermission,
            diagnostico_permissoes,
            ip,
          },
          'Acesso negado: permissão insuficiente',
        );
        throw new ForbiddenException(
          `Permissão necessária: ${requiredPermission}`,
        );
      }
      return true;
    }

    if (requiredRoles?.length) {
      const hasIt = await this.authz.hasAnyRole(
        userId,
        ctxLabel,
        requiredRoles,
      );
      if (!hasIt) {
        const roleSummary = await this.authz.getUserRoleSummary(userId);
        this.logger.warn(
          {
            event: 'ACCESS_DENIED',
            reason: 'insufficient_role',
            method,
            url,
            userId,
            papel_atual: roleSummary,
            contextId: ctxLabel ?? 'none',
            papeis_necessarios: requiredRoles,
            ip,
          },
          'Acesso negado: papel insuficiente',
        );
        throw new ForbiddenException(
          `Papel necessário: um de [${requiredRoles.join(', ')}]`,
        );
      }
      return true;
    }

    return true;
  }
}
