import {
  Injectable,
  ExecutionContext,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AuthGuard } from '@nestjs/passport';
import { PinoLogger, InjectPinoLogger } from 'nestjs-pino';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  constructor(
    private reflector: Reflector,
    @InjectPinoLogger(JwtAuthGuard.name) private readonly logger: PinoLogger,
  ) {
    super();
  }

  canActivate(context: ExecutionContext) {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (isPublic) {
      return true;
    }

    return super.canActivate(context);
  }

  handleRequest<TUser>(
    err: Error | null,
    user: TUser | false,
    info: Error | undefined,
    context?: ExecutionContext,
    status?: number,
  ): TUser {
    if (err || !user) {
      const request = context?.switchToHttp().getRequest();
      const method = request?.method;
      const url = request?.url ?? request?.path;
      const reason =
        err?.message ??
        (info as { message?: string })?.message ??
        (user === false ? 'token ausente ou inválido' : 'não autenticado');
      this.logger.warn(
        {
          event: 'AUTH_FAILED',
          reason,
          method,
          url,
          statusCode: 401,
        },
        'JWT auth failed: 401',
      );
      throw err ?? new UnauthorizedException();
    }
    return user;
  }
}
