import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { Response } from 'express';
import {
  ErrorResponseDto,
  MaintenanceInfoDto,
} from '../dto/error-response.dto';

@Catch(HttpException)
export class HttpExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message = 'Internal server error';
    let code = 'INTERNAL_SERVER_ERROR';
    let details: any[] | undefined;
    let maintenance: MaintenanceInfoDto | undefined;

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const exceptionResponse = exception.getResponse();

      if (typeof exceptionResponse === 'string') {
        message = exceptionResponse;
      } else if (typeof exceptionResponse === 'object') {
        const responseObj = exceptionResponse as any;
        message = responseObj.message || exception.message;
        code = responseObj.code || exception.name;
        details = responseObj.details;
        maintenance = responseObj.maintenance;
      }
    } else if (exception instanceof Error) {
      message = exception.message;
      code = exception.name;
    }

    const errorResponse: ErrorResponseDto = {
      error: {
        code,
        message,
        ...(details && { details }),
        ...(maintenance && { maintenance }),
      },
    };

    HttpExceptionFilter.applyRetryAfter(response, maintenance);
    response.status(status).json(errorResponse);
  }

  /** Contrato do 503: informa ao cliente (e a proxies) quando voltar a tentar. */
  private static applyRetryAfter(
    response: Response,
    maintenance?: MaintenanceInfoDto,
  ): void {
    if (!maintenance?.endsAt) {
      return;
    }

    const remainingMs = new Date(maintenance.endsAt).getTime() - Date.now();
    if (Number.isNaN(remainingMs) || remainingMs <= 0) {
      return;
    }

    response.setHeader('Retry-After', String(Math.ceil(remainingMs / 1000)));
  }
}
