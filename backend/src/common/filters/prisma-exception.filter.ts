import {
  Catch,
  ArgumentsHost,
  HttpStatus,
  ExceptionFilter,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { Response } from 'express';

/**
 * Exception filter for Prisma errors following RFC 9457 (Problem Details for HTTP APIs)
 * Converts Prisma database errors into standardized HTTP problem details responses
 */
@Catch(Prisma.PrismaClientKnownRequestError)
export class PrismaExceptionFilter implements ExceptionFilter {
  catch(exception: Prisma.PrismaClientKnownRequestError, host: ArgumentsHost) {
    console.log(
      'PrismaExceptionFilter caught error:',
      exception.code,
      exception.message,
    );

    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let type = 'about:blank';
    let title = 'Database Error';
    let detail = exception.message;
    let field: string | undefined;

    // Handle specific Prisma error codes
    // Reference: https://www.prisma.io/docs/reference/api-reference/error-reference
    switch (exception.code) {
      case 'P2002': // Unique constraint violation
        status = HttpStatus.CONFLICT;
        type = '/errors/unique-constraint';
        title = 'Unique Constraint Violation';

        // Extract field name from meta
        const target = exception.meta?.target as string[];
        field = target?.[0];
        detail = field
          ? `A record with this ${field} already exists`
          : 'A record with these values already exists';
        break;

      case 'P2025': // Record not found
        status = HttpStatus.NOT_FOUND;
        type = '/errors/not-found';
        title = 'Record Not Found';
        detail = 'The requested record was not found';
        break;

      case 'P2003': // Foreign key constraint
        status = HttpStatus.BAD_REQUEST;
        type = '/errors/foreign-key';
        title = 'Foreign Key Constraint Violation';
        detail = 'The referenced record does not exist';
        field = exception.meta?.field_name as string;
        break;

      case 'P2014': // Required relation violation
        status = HttpStatus.BAD_REQUEST;
        type = '/errors/required-relation';
        title = 'Required Relation Violation';
        detail = 'The change would violate a required relation';
        break;

      default:
        // For unknown Prisma errors, use generic database error
        status = HttpStatus.INTERNAL_SERVER_ERROR;
        type = '/errors/database';
        title = 'Database Error';
        detail = 'An unexpected database error occurred';
    }

    // RFC 9457 Problem Details format
    const problemDetails = {
      type,
      title,
      status,
      detail,
      instance: request.url,
      ...(field && { field }),
    };

    response.status(status).json(problemDetails);
  }
}
