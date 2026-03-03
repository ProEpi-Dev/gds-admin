import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { PinoLogger, InjectPinoLogger } from 'nestjs-pino';

@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  constructor(
    @InjectPinoLogger(LoggingInterceptor.name)
    private readonly logger: PinoLogger,
  ) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    const { method, url } = request;
    const now = Date.now();

    return next.handle().pipe(
      tap({
        next: () => {
          const response = context.switchToHttp().getResponse();
          this.logger.info(
            { method, url, statusCode: response.statusCode, ms: Date.now() - now },
            `${method} ${url}`,
          );
        },
        error: (error) => {
          this.logger.error(
            {
              method,
              url,
              statusCode: error.status || 500,
              ms: Date.now() - now,
              errMessage: error.message,
            },
            `${method} ${url}`,
          );
        },
      }),
    );
  }
}
